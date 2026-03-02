package com.aiquantum.trade.service;

import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.repository.OpportunityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Swing Trading Service — Daily D1 Timeframe Analysis.
 *
 * Delegates data fetching to the Python AI Lab (/lab/swing/scan), which pulls
 * yfinance D1 data directly — no MT5 dependency for scanning.
 * Runs once per day at 00:01 to generate swing setups using XGBoost model.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SwingTradingService {

    private static final String SWING_SCAN_URL = "http://localhost:8002/lab/swing/scan";
    private static final double MIN_CONFIDENCE  = 0.45;

    private final OpportunityRepository opportunityRepository;
    private final RestTemplate restTemplate;

    private final List<String> SWING_ASSETS = Arrays.asList(
            // Crypto
            "BTCUSD", "ETHUSD", "SOLUSD",
            // Commodities
            "XAUUSD", "XAGUSD", "USOIL",
            // Forex
            "EURUSD", "GBPUSD", "USDJPY", "AUDUSD",
            // Indices
            "NAS100", "US500", "US30", "UK100", "GER40",
            // Stocks
            "AAPL", "NVDA", "TSLA", "MSFT", "AMZN");

    /**
     * Daily Cron Job — runs at 00:01 every day.
     */
    @Scheduled(cron = "0 1 0 * * *")
    public void scanForSwingTrades() {
        log.info("🔄 Starting Daily Swing Trade Scan (Python yfinance D1)...");
        expirePreviousDaySignals();
        runPythonScan();
        log.info("✅ Daily Swing Trade Scan completed.");
    }

    /** Called by the controller for manual scans. */
    public void expirePreviousDaySignalsPublic() {
        expirePreviousDaySignals();
    }

    /**
     * Expire any ACTIVE swing signals from previous days.
     */
    private void expirePreviousDaySignals() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        List<Opportunity> activeSwings = opportunityRepository
                .findByIsSwingTrueAndStatusAndCreatedAtBefore("ACTIVE", startOfToday);
        for (Opportunity opp : activeSwings) {
            opp.setStatus("EXPIRED");
            opportunityRepository.save(opp);
            log.info("⏰ Expired: {} {} (created {})", opp.getSide(), opp.getSymbol(), opp.getCreatedAt());
        }
        if (!activeSwings.isEmpty()) {
            log.info("Expired {} old swing signals.", activeSwings.size());
        }
    }

    /**
     * Call the Python /lab/swing/scan endpoint (self-fetches yfinance data).
     * Saves each BUY/SELL result to the DB.
     */
    @SuppressWarnings("unchecked")
    public void runPythonScan() {
        try {
            Map<String, Object> request = Map.of(
                    "symbols",       SWING_ASSETS,
                    "minConfidence", MIN_CONFIDENCE);

            Map<String, Object> response = restTemplate.postForObject(SWING_SCAN_URL, request, Map.class);
            if (response == null) {
                log.warn("Empty response from Python /lab/swing/scan");
                return;
            }

            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            int scanned = response.get("scanned") instanceof Number
                    ? ((Number) response.get("scanned")).intValue() : 0;

            if (results == null || results.isEmpty()) {
                log.info("No swing signals found (scanned {} symbols)", scanned);
                return;
            }

            for (Map<String, Object> r : results) {
                String symbol     = (String) r.get("symbol");
                String signal     = (String) r.get("signal");
                double confidence = r.get("confidence") instanceof Number
                        ? ((Number) r.get("confidence")).doubleValue() : 0.0;
                String reason     = (String) r.getOrDefault("reason", "");
                double price      = r.get("price") instanceof Number
                        ? ((Number) r.get("price")).doubleValue() : 0.0;
                double atr        = r.get("atr") instanceof Number
                        ? ((Number) r.get("atr")).doubleValue() : 0.0;

                double sl, tp;
                if ("BUY".equals(signal) && atr > 0) {
                    sl = price - (1.5 * atr);
                    tp = price + (3.0 * atr);
                } else if ("SELL".equals(signal) && atr > 0) {
                    sl = price + (1.5 * atr);
                    tp = price - (3.0 * atr);
                } else {
                    sl = 0; tp = 0;
                }

                saveSwingOpportunity(symbol, signal, confidence, reason, price, sl, tp);
            }

            log.info("🌊 Saved {}/{} swing signals", results.size(), scanned);
        } catch (Exception e) {
            log.error("Python swing scan failed: {}", e.getMessage());
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
        opp.setStatus("ACTIVE");
        opp.setCreatedAt(LocalDateTime.now());
        opp.setEntryPrice(entryPrice);
        opp.setSl(sl);
        opp.setTp(tp);

        opportunityRepository.save(opp);
    }
}
