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
        // 1. Get open/executed trades from DB
        List<Trade> pendingSyncTrades = tradeRepository.findByUserIdAndStatus(userId, "EXECUTED");
        if (pendingSyncTrades.isEmpty())
            return;

        log.info("Syncing {} trades for user {}", pendingSyncTrades.size(), userId);

        // 2. Fetch recent history from MT5 (last 30 days)
        List<Mt5ConnectorClient.Mt5Deal> history = mt5Client.getHistory(baseUrl, 30);
        if (history.isEmpty())
            return;

        // Group history by positionId for easier matching
        // Note: Closing deals have entry = OUT (1)
        Map<Long, List<Mt5ConnectorClient.Mt5Deal>> dealsByPosition = history.stream()
                .collect(Collectors.groupingBy(Mt5ConnectorClient.Mt5Deal::getPositionId));

        for (Trade trade : pendingSyncTrades) {
            try {
                String extId = trade.getExternalOrderId();
                if (extId == null) {
                    log.warn("Trade #{} has no externalOrderId, skipping.", trade.getId());
                    continue;
                }

                Long orderTicket = Long.valueOf(extId);
                Long targetPositionId = null;

                // Strategy: Find any deal in history whose 'order' matches our
                // 'externalOrderId'
                Optional<Mt5ConnectorClient.Mt5Deal> anyDealForOrder = history.stream()
                        .filter(d -> orderTicket.equals(d.getOrder()))
                        .findFirst();

                if (anyDealForOrder.isPresent()) {
                    targetPositionId = anyDealForOrder.get().getPositionId();
                } else {
                    // Fallback: Check if the ticket itself is a position ID in our grouping
                    if (dealsByPosition.containsKey(orderTicket)) {
                        targetPositionId = orderTicket;
                    }
                }

                if (targetPositionId == null) {
                    log.debug("No MT5 position found for Trade #{} (Order ID: {})", trade.getId(), orderTicket);
                    continue;
                }

                List<Mt5ConnectorClient.Mt5Deal> positionDeals = dealsByPosition.get(targetPositionId);
                if (positionDeals == null || positionDeals.isEmpty())
                    continue;

                // 3. Find the closing deal (Entry = OUT)
                Mt5ConnectorClient.Mt5Deal closingDeal = positionDeals.stream()
                        .filter(d -> "OUT".equals(d.getEntry()))
                        .findFirst()
                        .orElse(null);

                if (closingDeal != null) {
                    log.info("🔥 Sync: Trade #{} (Pos: {}) CLOSED on MT5. PnL: {}, Reason: {}",
                            trade.getId(), targetPositionId, closingDeal.getProfit(), closingDeal.getReason());

                    trade.setExitPrice(closingDeal.getPrice());
                    double netProfit = (closingDeal.getProfit() != null ? closingDeal.getProfit() : 0.0)
                            + (closingDeal.getCommission() != null ? closingDeal.getCommission() : 0.0)
                            + (closingDeal.getSwap() != null ? closingDeal.getSwap() : 0.0);

                    trade.setPnl(netProfit);
                    trade.setExitTime(LocalDateTime.ofInstant(
                            Instant.ofEpochSecond(closingDeal.getTime()), ZoneId.systemDefault()));

                    String status = "CLOSED";
                    if (closingDeal.getReason() != null) {
                        if (closingDeal.getReason() == 3)
                            status = "SL HIT";
                        else if (closingDeal.getReason() == 4)
                            status = "TP HIT";
                    }
                    if (status.equals("CLOSED") && closingDeal.getComment() != null) {
                        String comment = closingDeal.getComment().toLowerCase();
                        if (comment.contains("sl"))
                            status = "SL HIT";
                        else if (comment.contains("tp"))
                            status = "TP HIT";
                    }

                    trade.setStatus(status);
                    tradeRepository.save(trade);

                    // Propagate close status back to the linked Opportunity
                    final String finalStatus = status;
                    if (trade.getOpportunityId() != null) {
                        opportunityRepository.findById(trade.getOpportunityId()).ifPresent(opp -> {
                            opp.setStatus(finalStatus);
                            opportunityRepository.save(opp);
                            log.info("📊 Updated Opportunity #{} status to '{}'", opp.getId(), finalStatus);
                        });
                    }

                    log.info("✅ Sync success for Trade #{}", trade.getId());
                } else {
                    log.info("Sync: Trade #{} (Pos: {}) is still OPEN in MT5.", trade.getId(), targetPositionId);
                }

            } catch (Exception e) {
                log.error("Error syncing trade {}: {}", trade.getId(), e.getMessage());
            }
        }
    }
}
