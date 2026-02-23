package com.aiquantum.trade.controller;

import com.aiquantum.trade.dto.ScanResultDTO;
import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.service.Mt5ConnectorClient;
import com.aiquantum.trade.service.UserContextService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Targeted AI Scan Controller — Human-in-the-Loop Trade Execution.
 * Fetches candles from MT5, sends them to the XGBoost predict endpoint,
 * and returns the multi-class prediction without auto-executing.
 */
@Slf4j
@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
public class ScanController {

    private static final String PYTHON_SERVICE_URL = "http://localhost:8002/lab/predict/xgboost";

    private final BotConfigurationRepository botConfigRepository;
    private final Mt5ConnectorClient mt5Client;
    private final UserContextService userContextService;
    private final RestTemplate restTemplate;

    @Data
    public static class ScanRequest {
        private String symbol;
        private String timeframe = "H1";
    }

    @PostMapping("/targeted")
    public ResponseEntity<?> runTargetedScan(@RequestBody ScanRequest request) {
        String userId = userContextService.getCurrentUserId();
        String symbol = request.getSymbol();
        String timeframe = request.getTimeframe();

        log.info("🎯 Targeted Scan requested by user {} for {} ({})", userId, symbol, timeframe);

        try {
            // 1. Get user's active bot configuration (for MT5 connectivity)
            BotConfiguration bot = botConfigRepository.findByUserIdAndActiveTrue(userId)
                    .orElse(null);

            if (bot == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "No active configuration found. Please save your config first."));
            }

            // 2. Fetch candles from MT5
            var authParams = new com.aiquantum.trade.dto.BotConfigurationDTO.ConnectivityParameters();
            authParams.setMt5Login(bot.getMt5Login());
            authParams.setMt5Password(bot.getMt5Password());
            authParams.setMt5Server(bot.getMt5Server());
            authParams.setMt5Path(bot.getMt5Path());
            authParams.setAccountType(bot.getAccountType());
            authParams.setMt5ConnectorBaseUrl(bot.getMt5ConnectorBaseUrl());

            List<Mt5ConnectorClient.Candle> candles = mt5Client.getCandles(
                    bot.getMt5ConnectorBaseUrl(), symbol, timeframe, 2000, authParams);

            if (candles.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "No market data received from MT5 for " + symbol + ". Check your connection."));
            }
            log.info("📊 Received {} candles for {} ({})", candles.size(), symbol, timeframe);

            // 3. Call XGBoost predict endpoint (handles model loading, features, reasoning)
            Map<String, Object> aiRequest = Map.of(
                    "symbol", symbol,
                    "marketData", candles);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(PYTHON_SERVICE_URL, aiRequest, Map.class);

            if (response == null) {
                return ResponseEntity.internalServerError().body(Map.of("error", "AI engine returned empty response."));
            }

            // 4. Build ScanResultDTO from Python response
            String signal = (String) response.getOrDefault("signal", "HOLD");
            double confidence = response.get("confidence") instanceof Number
                    ? ((Number) response.get("confidence")).doubleValue()
                    : 0.0;
            String reason = (String) response.getOrDefault("reason", "");

            // Extract price and ATR from response data
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

            // Calculate SL/TP from ATR
            double sl, tp;
            if ("BUY".equals(signal) && atr > 0) {
                sl = currentPrice - (1.0 * atr);
                tp = currentPrice + (1.5 * atr);
            } else if ("SELL".equals(signal) && atr > 0) {
                sl = currentPrice + (1.0 * atr);
                tp = currentPrice - (1.5 * atr);
            } else {
                sl = 0;
                tp = 0;
            }

            // Feature importance from Python response
            @SuppressWarnings("unchecked")
            Map<String, Double> featureImportance = (Map<String, Double>) response.get("feature_importance");

            // Probabilities
            @SuppressWarnings("unchecked")
            Map<String, Double> probabilities = (Map<String, Double>) response.get("probabilities");

            ScanResultDTO result = ScanResultDTO.builder()
                    .symbol(symbol)
                    .action(signal)
                    .confidence(Math.round(confidence * 10000.0) / 10000.0)
                    .mainIdea(reason)
                    .entryPrice(Math.round(currentPrice * 100000.0) / 100000.0)
                    .sl(Math.round(sl * 100000.0) / 100000.0)
                    .tp(Math.round(tp * 100000.0) / 100000.0)
                    .probabilities(probabilities)
                    .featureImportance(featureImportance)
                    .build();

            log.info("🎯 Scan Result: {} {} ({}% confidence) — {}", symbol, signal,
                    Math.round(confidence * 100), reason);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Targeted scan failed for {}: {}", symbol, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Scan failed: " + e.getMessage()));
        }
    }
}
