package com.aiquantum.trade.service;

import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.repository.OpportunityRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SwingTradingService {

    private final OpportunityRepository opportunityRepository;
    private final RestTemplate restTemplate;

    @Value("${ai-engine.url:http://localhost:8000}")
    private String aiEngineUrl;

    // List of assets to scan for Swing Trades
    private final List<String> SWING_ASSETS = Arrays.asList(
            "BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD",
            "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", // Gold
            "^NDX", "^GSPC" // Nasdaq 100, S&P 500
    );

    @Data
    static class SwingRequest {
        String symbol;

        public SwingRequest(String symbol) {
            this.symbol = symbol;
        }
    }

    @Data
    static class SwingResponse {
        String symbol;
        String signalType; // SWING_LONG, SWING_SHORT, NEUTRAL
        String trend;
        String entryZone;
        String stopLoss;
        String takeProfit;
        String reasoning;
        String error;
    }

    // Run every 4 hours: 00:00, 04:00, 08:00, etc.
    @Scheduled(cron = "0 0 */4 * * *")
    public void scanForSwingTrades() {
        log.info("Starting scheduled Swing Trade Scan...");

        for (String symbol : SWING_ASSETS) {
            try {
                analyzeSymbol(symbol);
                // Sleep to be nice to the AI Engine / Data Provider rate limits
                Thread.sleep(2000);
            } catch (Exception e) {
                log.error("Error analyzing swing for {}: {}", symbol, e.getMessage());
            }
        }
        log.info("Swing Trade Scan completed.");
    }

    // Public method for manual trigger
    public void analyzeSymbol(String symbol) {
        String url = aiEngineUrl + "/analyze/swing";
        SwingRequest request = new SwingRequest(symbol);

        try {
            SwingResponse response = restTemplate.postForObject(url, request, SwingResponse.class);

            if (response != null && response.getError() == null) {
                if ("SWING_LONG".equals(response.getSignalType()) || "SWING_SHORT".equals(response.getSignalType())) {
                    saveSwingOpportunity(response);
                } else {
                    log.info("No swing signal for {}: {} ({})", symbol, response.getSignalType(),
                            response.getReasoning());
                }
            }
        } catch (Exception e) {
            log.error("Failed to call AI Engine for {}", symbol, e);
        }
    }

    private void saveSwingOpportunity(SwingResponse response) {
        log.info("🔥 SWING SIGNAL FOUND: {} on {}", response.getSignalType(), response.getSymbol());

        Opportunity opp = new Opportunity();
        opp.setSymbol(response.getSymbol());
        opp.setSide(response.getSignalType().replace("SWING_", "")); // LONG/SHORT
        opp.setIsSwing(true);
        opp.setStrategyBreakdown(response.getReasoning() + " [Entry: " + response.getEntryZone() + "]");
        opp.setSource("AI_SWING_ENGINE_D1_H4");
        opp.setConfidence(0.85); // High confidence for confirmed swing setups
        opp.setStatus("PENDING");
        opp.setCreatedAt(LocalDateTime.now());

        // Parse levels if possible, or store as 0 for now and let user read the
        // breakdown
        try {
            opp.setTp(Double.parseDouble(response.getTakeProfit()));
            opp.setSl(Double.parseDouble(response.getStopLoss()));
            // Entry price is a range, we can take the midpoint or just leave 0
        } catch (Exception e) {
            log.warn("Could not parse prices for swing trade: {}", e.getMessage());
        }

        opportunityRepository.save(opp);

        // TODO: Notification logic here (WebSocket/Email)
    }
}
