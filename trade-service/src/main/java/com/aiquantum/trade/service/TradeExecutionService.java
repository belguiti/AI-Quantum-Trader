package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.BotConfigurationDTO;
import com.aiquantum.trade.dto.OrderIntentDTO;
import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.model.RiskState;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.RiskStateRepository;
import com.aiquantum.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeExecutionService {

    private final RiskStateRepository riskStateRepository;
    private final TradeRepository tradeRepository;
    private final BotConfigurationRepository botConfigRepository;
    private final Mt5ConnectorClient mt5Client;
    private final OrderProducer orderProducer;
    private final com.aiquantum.trade.repository.OpportunityRepository opportunityRepository;

    @Transactional
    public boolean processOpportunity(Opportunity opportunity, BotConfiguration config) {
        log.info("Processing opportunity for Risk Review: {}", opportunity.getId());

        // 1. Fetch Risk State
        RiskState riskState = riskStateRepository.findByUserId(config.getUserId())
                .orElseGet(() -> {
                    RiskState rs = new RiskState();
                    rs.setUserId(config.getUserId());
                    rs.setDailyPnl(0.0);
                    return riskStateRepository.save(rs);
                });

        // 2. Check Circuit Breaker
        if (riskState.isCircuitBreakerTripped()) {
            log.warn("Risk Review Rejected: Circuit Beaker Tripped for user {}", config.getUserId());
            opportunity.setStatus("SKIPPED_RISK_CONTROL");
            opportunity.setStrategyBreakdown("Circuit Breaker Tripped");
            opportunityRepository.save(opportunity);
            return false;
        }

        // 3. Check Daily Loss Limit
        double maxLoss = config.getMaxDailyLossPct() != null ? config.getMaxDailyLossPct() : 5.0;
        // Need Balance to calculate pct, fetch from MT5
        Double accountBalance = 10000.0; // Default fallback
        try {
            var summary = mt5Client.getAccountSummary(config.getMt5ConnectorBaseUrl());
            if (summary != null && summary.getBalance() != null)
                accountBalance = summary.getBalance();
        } catch (Exception e) {
            log.warn("Could not fetch account balance, using default");
        }

        if (riskState.getDailyPnl() < -(accountBalance * (maxLoss / 100.0))) {
            log.warn("Risk Review Rejected: Daily Loss Limit Hit");
            riskState.setCircuitBreakerTripped(true);
            riskStateRepository.save(riskState);
            opportunity.setStatus("SKIPPED_RISK_CONTROL");
            opportunity.setStrategyBreakdown("Daily Loss Limit Hit");
            opportunityRepository.save(opportunity);
            return false;
        }

        // 4. Cooldown Check
        if (riskState.getLastLossTime() != null) {
            int cooldown = config.getCooldownMinutesAfterLoss() != null ? config.getCooldownMinutesAfterLoss() : 0;
            if (resourceIsLocked(riskState.getLastLossTime(), cooldown)) {
                log.warn("Risk Review Rejected: In Cooldown");
                opportunity.setStatus("SKIPPED_RISK_CONTROL");
                opportunity.setStrategyBreakdown("Cool Down Active");
                opportunityRepository.save(opportunity);
                return false;
            }
        }

        // 5. Max Open Trades Check
        int maxTrades = config.getMaxOpenTrades() != null ? config.getMaxOpenTrades() : 3;

        // Sync local 'EXECUTED' trades with MT5 before counting
        try {
            var mt5Positions = mt5Client.getOpenPositions(config.getMt5ConnectorBaseUrl());
            if (mt5Positions != null) {
                java.util.Set<String> mt5Tickets = mt5Positions.stream()
                        .map(p -> String.valueOf(p.getTicket()))
                        .collect(java.util.stream.Collectors.toSet());

                java.util.List<com.aiquantum.trade.model.Trade> dbTrades = tradeRepository
                        .findByUserIdAndStatus(config.getUserId(), "EXECUTED");

                for (com.aiquantum.trade.model.Trade t : dbTrades) {
                    if (t.getExternalOrderId() != null && !mt5Tickets.contains(t.getExternalOrderId())) {
                        log.info("Trade {} not found in MT5 anymore. Marking as CLOSED.", t.getExternalOrderId());
                        t.setStatus("CLOSED");
                        tradeRepository.save(t);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to sync MT5 positions, falling back to current local DB status", e);
        }

        long openCount = tradeRepository.countByUserIdAndStatus(config.getUserId(), "EXECUTED");
        if (openCount >= maxTrades) {
            log.warn("Risk Review Rejected: Max Open Trades Limit Hit ({}/{})", openCount, maxTrades);
            opportunity.setStatus("SKIPPED_RISK_CONTROL");
            opportunity.setStrategyBreakdown("Max Open Trades Limit Reached (" + openCount + "/" + maxTrades + ")");
            opportunityRepository.save(opportunity);
            return false;
        }

        // 6. Position Sizing
        // User requested Fixed-Ratio sizing: 5-10 lots for a 100k account.
        // We will use 7.5 lots per 100k as the baseline ratio.
        // Formula: Lot Size = (Account Balance / 100_000) * 7.5
        double targetLotsPer100k = 7.5;
        double quantity = (accountBalance / 100000.0) * targetLotsPer100k;

        try {
            var symbolInfo = mt5Client.getSymbolInfo(config.getMt5ConnectorBaseUrl(), opportunity.getSymbol());
            if (symbolInfo != null) {
                // Fine-tune with volume constraints from broker
                Double volStep = symbolInfo.getVolume_step();
                Double volMin = symbolInfo.getVolume_min();
                Double volMax = symbolInfo.getVolume_max();

                if (volStep != null && volStep > 0) {
                    quantity = Math.floor(quantity / volStep) * volStep;
                }
                if (volMin != null && quantity < volMin) {
                    quantity = volMin;
                }
                if (volMax != null && quantity > volMax) {
                    quantity = volMax;
                }

                log.info("Fixed-Ratio Sizing for {}: Balance={}, TargetLotsPer100k={}, FinalQty={}",
                        opportunity.getSymbol(), accountBalance, targetLotsPer100k, quantity);
            } else {
                log.warn("Could not fetch symbol info for broker constraints for {}, using raw calculated sizing",
                        opportunity.getSymbol());
                quantity = Math.round(quantity * 100.0) / 100.0;
            }
        } catch (Exception e) {
            log.error("Error during position sizing constraint application", e);
            quantity = Math.round(quantity * 100.0) / 100.0;
        }

        // 7. Approve
        log.info("Risk Review Approved. Sizing: {} lots", quantity);
        opportunity.setStatus("APPROVED");
        opportunityRepository.save(opportunity);

        OrderIntentDTO intent = new OrderIntentDTO();
        intent.setOpportunityId(String.valueOf(opportunity.getId()));
        intent.setUserId(config.getUserId());
        intent.setSymbol(opportunity.getSymbol());
        intent.setSide(opportunity.getSide());
        intent.setQuantity(quantity);
        intent.setSl(opportunity.getSl());
        intent.setTp(opportunity.getTp());
        intent.setComment("AI-Quantum Auto Trade");
        intent.setMt5BaseUrl(config.getMt5ConnectorBaseUrl());

        orderProducer.sendOrderIntent(intent);

        return true;
    }

    private boolean resourceIsLocked(LocalDateTime lastLossTime, int cooldownMinutes) {
        return LocalDateTime.now().isBefore(lastLossTime.plusMinutes(cooldownMinutes));
    }
}
