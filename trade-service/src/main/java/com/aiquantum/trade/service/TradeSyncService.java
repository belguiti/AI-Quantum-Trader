package com.aiquantum.trade.service;

import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.model.Trade;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.OpportunityRepository;
import com.aiquantum.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeSyncService {

    private final TradeRepository tradeRepository;
    private final BotConfigurationRepository botConfigRepository;
    private final OpportunityRepository opportunityRepository;
    private final Mt5ConnectorClient mt5Client;

    /**
     * Run trade sync every 5 minutes.
     */
    @Scheduled(fixedRate = 300000)
    public void scheduledSync() {
        log.info("Starting scheduled trade history sync...");
        syncAllTrades();
    }

    public synchronized void syncAllTrades() {
        // 1. Get all users who have an EXECUTED trade (or we could just get all
        // configs)
        List<BotConfiguration> configs = botConfigRepository.findAll();

        for (BotConfiguration config : configs) {
            String baseUrl = config.getMt5ConnectorBaseUrl();
            if (baseUrl == null || baseUrl.isEmpty())
                continue;

            syncUserTrades(config.getUserId(), baseUrl);
        }
    }

    @Transactional
    public void syncUserTrades(String userId, String baseUrl) {
        // 1. Get executed trades from DB
        List<Trade> pendingSyncTrades = tradeRepository.findByUserIdAndStatus(userId, "EXECUTED");
        if (pendingSyncTrades.isEmpty())
            return;

        log.info("Syncing {} trades for user {}", pendingSyncTrades.size(), userId);

        // 2. Fetch live positions from MT5 to refresh SL/TP/entryPrice for open trades
        List<Mt5ConnectorClient.Mt5Position> livePositions = mt5Client.getOpenPositions(baseUrl);
        Map<String, Mt5ConnectorClient.Mt5Position> liveByTicket = livePositions.stream()
                .collect(Collectors.toMap(p -> String.valueOf(p.getTicket()), p -> p, (a, b) -> a));

        // 3. Fetch recent history from MT5 (last 30 days)
        List<Mt5ConnectorClient.Mt5Deal> history = mt5Client.getHistory(baseUrl, 30);
        Map<Long, List<Mt5ConnectorClient.Mt5Deal>> dealsByPosition = history.isEmpty()
                ? new java.util.HashMap<>()
                : history.stream().collect(Collectors.groupingBy(Mt5ConnectorClient.Mt5Deal::getPositionId));

        for (Trade trade : pendingSyncTrades) {
            try {
                String extId = trade.getExternalOrderId();
                if (extId == null) {
                    log.warn("Trade #{} has no externalOrderId, skipping.", trade.getId());
                    continue;
                }

                // --- Update from live position (still open in MT5) ---
                Mt5ConnectorClient.Mt5Position livePos = liveByTicket.get(extId);
                if (livePos != null) {
                    boolean changed = false;
                    if (livePos.getOpenPrice() != null && !livePos.getOpenPrice().equals(trade.getEntryPrice())) {
                        trade.setEntryPrice(livePos.getOpenPrice());
                        changed = true;
                    }
                    if (livePos.getSl() != null && livePos.getSl() > 0 && !livePos.getSl().equals(trade.getSl())) {
                        trade.setSl(livePos.getSl());
                        changed = true;
                    }
                    if (livePos.getTp() != null && livePos.getTp() > 0 && !livePos.getTp().equals(trade.getTp())) {
                        trade.setTp(livePos.getTp());
                        changed = true;
                    }
                    if (changed) {
                        tradeRepository.save(trade);
                        log.debug("Updated live data for Trade #{}", trade.getId());
                    }
                    continue; // Still open — skip closing logic
                }

                // --- Trade is no longer in live positions: look for closing deal ---
                Long orderTicket = Long.valueOf(extId);
                Long targetPositionId = null;

                Optional<Mt5ConnectorClient.Mt5Deal> anyDealForOrder = history.stream()
                        .filter(d -> orderTicket.equals(d.getOrder()))
                        .findFirst();

                if (anyDealForOrder.isPresent()) {
                    targetPositionId = anyDealForOrder.get().getPositionId();
                } else if (dealsByPosition.containsKey(orderTicket)) {
                    targetPositionId = orderTicket;
                }

                if (targetPositionId == null) {
                    log.debug("No MT5 position found for Trade #{} (Order: {})", trade.getId(), orderTicket);
                    continue;
                }

                List<Mt5ConnectorClient.Mt5Deal> positionDeals = dealsByPosition.get(targetPositionId);
                if (positionDeals == null || positionDeals.isEmpty())
                    continue;

                // Update entry price from the opening deal (IN)
                positionDeals.stream()
                        .filter(d -> "IN".equals(d.getEntry()))
                        .findFirst()
                        .ifPresent(openDeal -> {
                            if (openDeal.getPrice() != null) trade.setEntryPrice(openDeal.getPrice());
                        });

                // Find the closing deal (OUT)
                Mt5ConnectorClient.Mt5Deal closingDeal = positionDeals.stream()
                        .filter(d -> "OUT".equals(d.getEntry()))
                        .findFirst()
                        .orElse(null);

                if (closingDeal != null) {
                    trade.setExitPrice(closingDeal.getPrice());
                    double netProfit = (closingDeal.getProfit() != null ? closingDeal.getProfit() : 0.0)
                            + (closingDeal.getCommission() != null ? closingDeal.getCommission() : 0.0)
                            + (closingDeal.getSwap() != null ? closingDeal.getSwap() : 0.0);
                    trade.setPnl(netProfit);
                    trade.setExitTime(LocalDateTime.ofInstant(
                            Instant.ofEpochSecond(closingDeal.getTime()), ZoneId.systemDefault()));

                    // MT5 DEAL_REASON codes: 4 = SL hit, 5 = TP hit
                    String status = "CLOSED";
                    if (closingDeal.getReason() != null) {
                        if (closingDeal.getReason() == 4)
                            status = "SL HIT";
                        else if (closingDeal.getReason() == 5)
                            status = "TP HIT";
                    }
                    // Fallback: check deal comment text
                    if (status.equals("CLOSED") && closingDeal.getComment() != null) {
                        String comment = closingDeal.getComment().toLowerCase();
                        if (comment.contains("sl") || comment.contains("stop loss"))
                            status = "SL HIT";
                        else if (comment.contains("tp") || comment.contains("take profit"))
                            status = "TP HIT";
                    }

                    trade.setStatus(status);
                    tradeRepository.save(trade);

                    log.info("Sync: Trade #{} closed — status={}, PnL={}", trade.getId(), status, netProfit);

                    final String finalStatus = status;
                    if (trade.getOpportunityId() != null) {
                        opportunityRepository.findById(trade.getOpportunityId()).ifPresent(opp -> {
                            opp.setStatus(finalStatus);
                            opportunityRepository.save(opp);
                        });
                    }
                } else {
                    log.debug("Sync: Trade #{} position found in history but no closing deal yet.", trade.getId());
                }

            } catch (Exception e) {
                log.error("Error syncing trade {}: {}", trade.getId(), e.getMessage());
            }
        }
    }
}
