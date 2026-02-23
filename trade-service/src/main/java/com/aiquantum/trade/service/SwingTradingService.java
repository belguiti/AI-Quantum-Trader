package com.aiquantum.trade.service;

import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.OpportunityRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Swing Trading Service — Uses XGBoost Model with MT5 candle data.
 * Scans multiple assets on H4 timeframe using the trained AI model.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SwingTradingService {

    private static final String XGBOOST_PREDICT_URL = "http://localhost:8002/lab/predict/xgboost";

    private final OpportunityRepository opportunityRepository;
    private final BotConfigurationRepository botConfigRepository;
    private final Mt5ConnectorClient mt5Client;
    private final RestTemplate restTemplate;

    // List of assets to scan for Swing Trades
    private final List<String> SWING_ASSETS = Arrays.asList(
            "BTCUSD", "ETHUSD", "XAUUSD", "EURUSD", "GBPUSD", "USDJPY");

    // Run every 4 hours: 00:00, 04:00, 08:00, etc.
    @Scheduled(cron = "0 0 */4 * * *")
    public void scanForSwingTrades() {
        log.info("🔄 Starting scheduled Swing Trade Scan (XGBoost H4)...");

        for (String symbol : SWING_ASSETS) {
            try {
                analyzeSymbol(symbol);
                Thread.sleep(2000); // Rate limiting between symbols
            } catch (Exception e) {
                log.error("Error analyzing swing for {}: {}", symbol, e.getMessage());
            }
        }
        log.info("✅ Swing Trade Scan completed.");
    }

    /**
     * Analyze a single symbol using XGBoost model on H4 candles from MT5.
     */
    public void analyzeSymbol(String symbol) {
        try {
            // 1. Find any active bot config for MT5 connectivity
            List<BotConfiguration> configs = botConfigRepository.findAll();
            BotConfiguration bot = configs.stream()
                    .filter(c -> c.isActive())
                    .findFirst()
                    .orElse(configs.isEmpty() ? null : configs.get(0));

            if (bot == null || bot.getMt5ConnectorBaseUrl() == null) {
                log.warn("No bot configuration with MT5 connectivity found. Skipping swing scan for {}", symbol);
                return;
            }

            // 2. Fetch H4 candles from MT5
            var authParams = new com.aiquantum.trade.dto.BotConfigurationDTO.ConnectivityParameters();
            authParams.setMt5Login(bot.getMt5Login());
            authParams.setMt5Password(bot.getMt5Password());
            authParams.setMt5Server(bot.getMt5Server());
            authParams.setMt5Path(bot.getMt5Path());
            authParams.setAccountType(bot.getAccountType());
            authParams.setMt5ConnectorBaseUrl(bot.getMt5ConnectorBaseUrl());

            List<Mt5ConnectorClient.Candle> candles = mt5Client.getCandles(
                    bot.getMt5ConnectorBaseUrl(), symbol, "H4", 2000, authParams);

            if (candles.isEmpty()) {
                log.warn("⚠️ No H4 candle data for {} from MT5", symbol);
                return;
            }
            log.info("📊 Fetched {} H4 candles for {}", candles.size(), symbol);

            // 3. Call XGBoost predict endpoint
            Map<String, Object> aiRequest = Map.of(
                    "symbol", symbol,
                    "marketData", candles);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(XGBOOST_PREDICT_URL, aiRequest, Map.class);

            if (response == null) {
                log.warn("Empty response from XGBoost for {}", symbol);
                return;
            }

            String signal = (String) response.getOrDefault("signal", "HOLD");
            double confidence = response.get("confidence") instanceof Number
                    ? ((Number) response.get("confidence")).doubleValue()
                    : 0.0;
            String reason = (String) response.getOrDefault("reason", "");

            log.info("🎯 XGBoost Swing Signal for {}: {} ({}% conf) — {}",
                    symbol, signal, Math.round(confidence * 100), reason);

            // 4. Only save BUY or SELL signals with decent confidence
            if (("BUY".equals(signal) || "SELL".equals(signal)) && confidence >= 0.55) {
                // Extract price and ATR from response
                @SuppressWarnings("unchecked")
                Map<String, Object> dataPart = (Map<String, Object>) response.get("data");
                double currentPrice = 0.0;
                double atr = 0.0;
                if (dataPart != null) {
                    if (dataPart.containsKey("price"))
                        currentPrice = ((Number) dataPart.get("price")).doubleValue();
                    if (dataPart.containsKey("atr"))
                        atr = ((Number) dataPart.get("atr")).doubleValue();
                }

                // Calculate SL/TP
                double sl, tp;
                if ("BUY".equals(signal) && atr > 0) {
                    sl = currentPrice - (1.5 * atr); // Wider SL for swing
                    tp = currentPrice + (3.0 * atr); // 1:2 RR for swing
                } else if ("SELL".equals(signal) && atr > 0) {
                    sl = currentPrice + (1.5 * atr);
                    tp = currentPrice - (3.0 * atr);
                } else {
                    sl = 0;
                    tp = 0;
                }

                saveSwingOpportunity(symbol, signal, confidence, reason,
                        currentPrice, sl, tp);
            } else {
                log.info("No swing signal for {}: {} (conf: {})", symbol, signal, confidence);
            }

        } catch (Exception e) {
            log.error("Failed XGBoost swing analysis for {}: {}", symbol, e.getMessage());
        }
    }

    private void saveSwingOpportunity(String symbol, String signal, double confidence,
            String reason, double entryPrice, double sl, double tp) {
        log.info("🔥 SWING SIGNAL: {} {} ({}% conf)", signal, symbol, Math.round(confidence * 100));

        Opportunity opp = new Opportunity();
        opp.setSymbol(symbol);
        opp.setSide(signal); // BUY or SELL
        opp.setIsSwing(true);
        opp.setConfidence(confidence);
        opp.setStrategyBreakdown(reason);
        opp.setSource("XGBOOST_SWING_H4");
        opp.setStatus("PENDING");
        opp.setCreatedAt(LocalDateTime.now());
        opp.setEntryPrice(entryPrice);
        opp.setSl(sl);
        opp.setTp(tp);

        opportunityRepository.save(opp);
    }
}
