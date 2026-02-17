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
        // Need Equity to calculate pct, fetch from MT5
        Double equity = 10000.0; // Default fallback
        try {
            var summary = mt5Client.getAccountSummary(config.getMt5ConnectorBaseUrl());
            if (summary != null)
                equity = summary.getEquity();
        } catch (Exception e) {
            log.warn("Could not fetch equity, using default");
        }

        if (riskState.getDailyPnl() < -(equity * (maxLoss / 100.0))) {
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
        // 5. Max Open Trades Check
        int maxTrades = config.getMaxOpenTrades() != null ? config.getMaxOpenTrades() : 3;

        long openCount = tradeRepository.countByUserIdAndStatus(config.getUserId(), "EXECUTED");
        if (openCount >= maxTrades) {
            log.warn("Risk Review Rejected: Max Open Trades Limit Hit ({}/{})", openCount, maxTrades);
            opportunity.setStatus("SKIPPED_RISK_CONTROL");
            opportunity.setStrategyBreakdown("Max Open Trades Limit Reached (" + openCount + "/" + maxTrades + ")");
            opportunityRepository.save(opportunity);
            return false;
        }

        // 6. Position Sizing
        double riskPerTrade = config.getRiskPerTradePct() != null ? config.getRiskPerTradePct() : 1.0;
        double amountToRisk = equity * (riskPerTrade / 100.0);
        double dist = Math.abs(opportunity.getEntryPrice() - opportunity.getSl());
        if (dist == 0)
            dist = 0.0001; // prevent div by zero

        // Lot size calculation (Forex approx)
        // Lot = (AmountToRisk) / (PipValue * Pips)
        // Simplified: Quantity = AmountToRisk / Distance
        // This is heavily simplified for generic assets.
        double quantity = amountToRisk / dist;

        // Normalize quantity (e.g. 2 decimals)
        quantity = Math.round(quantity * 100.0) / 100.0;

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
