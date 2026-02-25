package com.aiquantum.trade.service;

import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.OpportunityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Swing Trading Service — Daily D1 Timeframe Analysis.
 * Runs once per day at 00:01 to generate swing setups using XGBoost model.
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

    /**
     * Daily Cron Job — runs at 00:01 every day.
     * 1. Expires previous day's ACTIVE swing signals.
     * 2. Analyzes D1 charts for new swing setups.
     */
    @Scheduled(cron = "0 1 0 * * *")
    public void scanForSwingTrades() {
        log.info("🔄 Starting Daily Swing Trade Scan (XGBoost D1)...");

        // Step 1: Expire old ACTIVE swing signals
        expirePreviousDaySignals();

        // Step 2: Scan all assets on D1
        for (String symbol : SWING_ASSETS) {
            try {
                analyzeSymbol(symbol);
                Thread.sleep(2000); // Rate limiting between symbols
            } catch (Exception e) {
                log.error("Error analyzing swing for {}: {}", symbol, e.getMessage());
            }
        }
        log.info("✅ Daily Swing Trade Scan completed.");
    }

    /**
     * Expire any ACTIVE swing signals from previous days.
     */
    private void expirePreviousDaySignals() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        List<Opportunity> activeSwings = opportunityRepository.findByIsSwingTrueAndStatusAndCreatedAtBefore("ACTIVE",
                startOfToday);
        for (Opportunity opp : activeSwings) {
            opp.setStatus("EXPIRED");
            opportunityRepository.save(opp);
            log.info("⏰ Expired swing signal: {} {} (created {})", opp.getSide(), opp.getSymbol(), opp.getCreatedAt());
        }
        if (!activeSwings.isEmpty()) {
            log.info("Expired {} old swing signals.", activeSwings.size());
        }
    }

    /**
     * Analyze a single symbol using XGBoost model on D1 candles from MT5.
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

            // 2. Fetch D1 candles from MT5
            var authParams = new com.aiquantum.trade.dto.BotConfigurationDTO.ConnectivityParameters();
            authParams.setMt5Login(bot.getMt5Login());
            authParams.setMt5Password(bot.getMt5Password());
            authParams.setMt5Server(bot.getMt5Server());
            authParams.setMt5Path(bot.getMt5Path());
            authParams.setAccountType(bot.getAccountType());
            authParams.setMt5ConnectorBaseUrl(bot.getMt5ConnectorBaseUrl());

            List<Mt5ConnectorClient.Candle> candles = mt5Client.getCandles(
                    bot.getMt5ConnectorBaseUrl(), symbol, "D1", 500, authParams);

            if (candles.isEmpty()) {
                log.warn("⚠️ No D1 candle data for {} from MT5", symbol);
                return;
            }
            log.info("📊 Fetched {} D1 candles for {}", candles.size(), symbol);

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

                // Calculate SL/TP with D1-appropriate
                double sl, tp;
                if ("BUY".equals(signal) && atr > 0) {
                    sl = currentPrice - (1.5 * atr);
                    tp = currentPrice + (3.0 * atr);
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
        opp.setSide(signal);
        opp.setIsSwing(true);
        opp.setConfidence(confidence);
        opp.setStrategyBreakdown(reason);
        opp.setSource("XGBOOST_SWING_D1");
        opp.setStatus("ACTIVE"); // New: ACTIVE instead of PENDING
        opp.setCreatedAt(LocalDateTime.now());
        opp.setEntryPrice(entryPrice);
        opp.setSl(sl);
        opp.setTp(tp);

        opportunityRepository.save(opp);
    }
}
