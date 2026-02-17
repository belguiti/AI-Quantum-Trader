package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.BotConfigurationDTO;
import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.OpportunityRepository;
import com.aiquantum.trade.strategy.TradingStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpportunityScannerService {

    private final BotConfigurationRepository customBotConfigRepository;
    private final OpportunityRepository opportunityRepository;
    private final MockMarketDataProvider marketDataProvider;
    private final List<TradingStrategy> strategies;
    private final TradeExecutionService riskEngine;

    @Scheduled(fixedRate = 60000) // Run every minute
    @Transactional
    public void scanMarkets() {
        log.info("Scanning markets for opportunities...");

        List<BotConfiguration> activeConfigs = customBotConfigRepository.findAll();

        Map<String, TradingStrategy> strategyMap = strategies.stream()
                .collect(Collectors.toMap(TradingStrategy::getName, Function.identity()));

        for (BotConfiguration config : activeConfigs) {
            if (!config.isActive())
                continue;

            BotConfigurationDTO configDTO = mapToDTO(config);
            TradingStrategy strategy = strategyMap.get(config.getSelectedStrategy());
            if (strategy == null) {
                log.warn("Strategy {} not found for config {}", config.getSelectedStrategy(), config.getId());
                continue;
            }

            if (config.getSymbols() == null)
                continue;

            for (String symbol : config.getSymbols()) {
                var marketData = marketDataProvider.getMarketData(symbol, config.getTimeframe());
                Optional<Opportunity> oppOpt = strategy.analyze(symbol, marketData, configDTO);

                if (oppOpt.isPresent()) {
                    Opportunity opp = oppOpt.get();
                    opp.setUserId(config.getUserId());
                    opp.setConfigVersion(config.getVersion());

                    // Risk Params / Stop Loss Calculation
                    calculateSlTp(opp, config);

                    opportunityRepository.save(opp);
                    log.info("Generated Opportunity: {} {} {}", opp.getSide(), opp.getSymbol(),
                            opp.getPredictedWinProbability());

                    // Auto Mode Execution
                    if ("AUTO".equalsIgnoreCase(config.getMode())) {
                        double threshold = config.getAiConfidenceThreshold() != null ? config.getAiConfidenceThreshold()
                                : 0.7;
                        double winProb = opp.getPredictedWinProbability() != null ? opp.getPredictedWinProbability()
                                : 0.0;
                        double conf = opp.getConfidence() != null ? opp.getConfidence() : 0.0;

                        if (winProb >= 0.70 && conf >= threshold) {
                            boolean approved = riskEngine.processOpportunity(opp, config);
                            if (approved) {
                                log.info("Auto-Trade Sent to Execution: {}", opp.getSymbol());
                            } else {
                                log.info("Auto-Trade Rejected by Risk Engine: {}", opp.getSymbol());
                            }
                            opportunityRepository.save(opp); // Update status
                        }
                    }
                }
            }
        }
    }

    private void calculateSlTp(Opportunity opp, BotConfiguration config) {
        double entry = opp.getEntryPrice();
        double slPct = config.getStopLossPercentage() != null ? config.getStopLossPercentage() : 1.0;
        double tpPct = config.getTakeProfitPercentage() != null ? config.getTakeProfitPercentage() : 2.0;

        if ("BUY".equalsIgnoreCase(opp.getSide())) {
            opp.setSl(entry * (1 - slPct / 100));
            opp.setTp(entry * (1 + tpPct / 100));
        } else {
            opp.setSl(entry * (1 + slPct / 100));
            opp.setTp(entry * (1 - tpPct / 100));
        }
    }

    private BotConfigurationDTO mapToDTO(BotConfiguration entity) {
        BotConfigurationDTO dto = new BotConfigurationDTO();
        BeanUtils.copyProperties(entity, dto);

        var aiParams = new BotConfigurationDTO.AiParameters();
        aiParams.setLookbackPeriod(entity.getAiLookbackPeriod());
        aiParams.setConfidenceThreshold(entity.getAiConfidenceThreshold());
        dto.setAiParameters(aiParams);

        var conn = new BotConfigurationDTO.ConnectivityParameters();
        conn.setEnableAiModel(entity.isEnableAiModel());
        conn.setMt5Login(entity.getMt5Login());
        conn.setMt5Password(entity.getMt5Password());
        conn.setMt5Server(entity.getMt5Server());
        conn.setAccountType(entity.getAccountType());
        conn.setMt5ConnectorBaseUrl(entity.getMt5ConnectorBaseUrl());
        conn.setAiEngineBaseUrl(entity.getAiEngineBaseUrl());
        dto.setConnectivity(conn);

        var risk = new BotConfigurationDTO.RiskParameters();
        risk.setStopLossPercentage(entity.getStopLossPercentage());
        risk.setTakeProfitPercentage(entity.getTakeProfitPercentage());
        // Map other risk params if needed by strategy
        dto.setRiskParameters(risk);

        return dto;
    }
}
