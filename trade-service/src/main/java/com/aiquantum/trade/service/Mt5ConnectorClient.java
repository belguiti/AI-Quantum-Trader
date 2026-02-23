package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.ConnectivityTestResultDTO;
import com.aiquantum.trade.dto.BotConfigurationDTO;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

@Service
@RequiredArgsConstructor
@Slf4j
public class Mt5ConnectorClient {

    private final RestTemplate restTemplate = new RestTemplate();
    // In a real app, use a configured RestTemplate bean with timeouts

    public ConnectivityTestResultDTO testConnection(BotConfigurationDTO.ConnectivityParameters config) {
        ConnectivityTestResultDTO result = new ConnectivityTestResultDTO();
        String baseUrl = config.getMt5ConnectorBaseUrl() != null ? config.getMt5ConnectorBaseUrl()
                : "http://127.0.0.1:5005";

        try {
            var request = new ConnectionRequest();
            request.setLogin(config.getMt5Login());
            request.setPassword(config.getMt5Password());
            request.setServer(config.getMt5Server());
            request.setAccountType(config.getAccountType());
            request.setPath(config.getMt5Path());

            var response = restTemplate.postForObject(baseUrl + "/mt5/test-connection", request,
                    ConnectionResponse.class);

            if (response != null) {
                result.setMt5Connected(response.isConnected());
                result.setMt5Message(response.getMessage());
                result.setMt5LatencyMs(response.getLatencyMs());
                result.setMt5AccountInfo(response.getAccountId());

                if (!response.isConnected()) {
                    log.error("MT5 Connection Failed: {}", response.getMessage());
                } else {
                    log.info("MT5 Connected: {}", response.getMessage());
                }
            }
        } catch (RestClientException e) {
            log.error("MT5 Connector Unreachable: {}", e.getMessage());
            result.setMt5Connected(false);
            result.setMt5Message("Connection Failed: " + e.getMessage());
        }

        // Test AI Engine if enabled
        if (config.isEnableAiModel()) {
            String aiUrl = config.getAiEngineBaseUrl() != null ? config.getAiEngineBaseUrl() : "http://localhost:8000";
            try {
                var aiResp = restTemplate.getForObject(aiUrl + "/health", AiHealthResponse.class);
                result.setAiConnected(true);
                result.setAiMessage("UP");
                result.setAiLatencyMs(10); // Dummy
            } catch (Exception e) {
                result.setAiConnected(false);
                result.setAiMessage("AI Unreachable: " + e.getMessage());
            }
        }

        return result;
    }

    public AccountSummary getAccountSummary(String baseUrl) {
        if (baseUrl == null)
            baseUrl = "http://localhost:5005";
        try {
            return restTemplate.getForObject(baseUrl + "/mt5/account-summary", AccountSummary.class);
        } catch (Exception e) {
            log.error("Failed to get account summary", e);
            return null;
        }
    }

    public OrderResponse placeOrder(String baseUrl, OrderIntent intent) {
        if (baseUrl == null)
            baseUrl = "http://localhost:5005";
        try {
            return restTemplate.postForObject(baseUrl + "/mt5/place-order", intent, OrderResponse.class);
        } catch (Exception e) {
            log.error("Failed to place order", e);
            return new OrderResponse(false, null, e.getMessage());
        }
    }

    @Data
    public static class ConnectionRequest {
        private Long login;
        private String password;
        private String server;
        private String accountType;
        private String path;
    }

    @Data
    public static class ConnectionResponse {
        private boolean connected;
        private String message;
        private Integer latencyMs;
        private String accountId;
    }

    @Data
    public static class AiHealthResponse {
        private String status;
    }

    @Data
    public static class AccountSummary {
        private Double balance;
        private Double equity;
        private Double margin;
        private Double freeMargin;
    }

    @Data
    public static class OrderIntent {
        private String symbol;
        private String side;
        private Double lot;
        private Double sl;
        private Double tp;
        private Integer deviation;
        private String comment;
    }

    @Data
    public static class SymbolInfo {
        private String name;
        private Double contract_size;
        private Double tick_value;
        private Double tick_size;
        private Double volume_step;
        private Double volume_min;
        private Double volume_max;
        private Integer digits;
        private Double point;
    }

    public SymbolInfo getSymbolInfo(String baseUrl, String symbol) {
        if (baseUrl == null)
            baseUrl = "http://localhost:5005";
        try {
            String url = String.format("%s/mt5/symbol-info?symbol=%s", baseUrl, symbol);
            return restTemplate.getForObject(url, SymbolInfo.class);
        } catch (Exception e) {
            log.error("Failed to get symbol info for {}", symbol, e);
            return null;
        }
    }

    public java.util.List<Candle> getCandles(String baseUrl, String symbol, String timeframe, int count) {
        return getCandles(baseUrl, symbol, timeframe, count, null);
    }

    public java.util.List<Candle> getCandles(String baseUrl, String symbol, String timeframe, int count,
            BotConfigurationDTO.ConnectivityParameters authParams) {
        if (baseUrl == null)
            baseUrl = "http://localhost:5005";

        // Helper to perform the actual request
        try {
            return fetchCandles(baseUrl, symbol, timeframe, count);
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            // 404 Not Found - Try variations
            log.warn("Symbol {} not found in MT5. Trying variations...", symbol);

            String[] variations = getSymbolVariations(symbol);
            for (String variant : variations) {
                if (variant.equals(symbol))
                    continue; // Skip self
                try {
                    log.info("Attempting variant: {}", variant);
                    return fetchCandles(baseUrl, variant, timeframe, count);
                } catch (Exception ex) {
                    // Continue to next variant
                }
            }
            log.error("Failed to find candles for {} or any variations.", symbol);
            return java.util.Collections.emptyList();

        } catch (Exception e) {
            // Check if it's the "MT5 not initialized" error (500 usually)
            if (e.getMessage().contains("MT5 not initialized") && authParams != null) {
                log.warn("MT5 disconnected. Attempting auto-reconnect for {}...", symbol);
                testConnection(authParams); // Re-auth
                try {
                    return fetchCandles(baseUrl, symbol, timeframe, count);
                } catch (Exception ex2) {
                    // If still fails, try variations as last resort if it was actually a 404
                    // disguised/mixed?
                    // But usually "MT5 not initialized" is distinct.
                    log.error("Failed to get candles after reconnect for {}", symbol, ex2);
                }
            } else {
                log.error("Failed to get candles for {}", symbol, e);
            }
            return java.util.Collections.emptyList();
        }
    }

    private java.util.List<Candle> fetchCandles(String baseUrl, String symbol, String timeframe, int count) {
        String url = String.format("%s/mt5/candles?symbol=%s&timeframe=%s&count=%d", baseUrl, symbol, timeframe, count);
        Candle[] candles = restTemplate.getForObject(url, Candle[].class);
        return candles != null ? java.util.Arrays.asList(candles) : java.util.Collections.emptyList();
    }

    private String[] getSymbolVariations(String symbol) {
        if (symbol.contains("-")) {
            // BTC-USD -> BTCUSD
            return new String[] { symbol.replace("-", "") };
        } else {
            // BTCUSD -> BTC-USD (Best guess split?)
            // If length is 6, split 3-3?
            if (symbol.length() == 6) {
                return new String[] { symbol.substring(0, 3) + "-" + symbol.substring(3) };
            }
            // Generalize?
            return new String[] {};
        }
    }

    @Data
    public static class Candle {
        private Long time;
        @com.fasterxml.jackson.annotation.JsonProperty("Open")
        private Double Open;
        @com.fasterxml.jackson.annotation.JsonProperty("High")
        private Double High;
        @com.fasterxml.jackson.annotation.JsonProperty("Low")
        private Double Low;
        @com.fasterxml.jackson.annotation.JsonProperty("Close")
        private Double Close;
        @com.fasterxml.jackson.annotation.JsonProperty("Volume")
        @com.fasterxml.jackson.annotation.JsonAlias("TickVolume")
        private Double TickVolume;
        @com.fasterxml.jackson.annotation.JsonProperty("Spread")
        private Integer Spread;
        @com.fasterxml.jackson.annotation.JsonProperty("RealVolume")
        private Double RealVolume;
    }

    public java.util.List<Mt5Position> getOpenPositions(String baseUrl) {
        if (baseUrl == null)
            baseUrl = "http://localhost:5005";
        try {
            Mt5Position[] positions = restTemplate.getForObject(baseUrl + "/mt5/positions", Mt5Position[].class);
            return positions != null ? java.util.Arrays.asList(positions) : java.util.Collections.emptyList();
        } catch (Exception e) {
            log.error("Failed to get open positions", e);
            return java.util.Collections.emptyList();
        }
    }

    public java.util.List<Mt5Deal> getHistory(String baseUrl, int days) {
        if (baseUrl == null)
            baseUrl = "http://localhost:5005";
        try {
            Mt5Deal[] deals = restTemplate.getForObject(baseUrl + "/mt5/history?days=" + days, Mt5Deal[].class);
            return deals != null ? java.util.Arrays.asList(deals) : java.util.Collections.emptyList();
        } catch (Exception e) {
            log.error("Failed to get trade history", e);
            return java.util.Collections.emptyList();
        }
    }

    @Data
    public static class Mt5Position {
        private Long ticket;
        private String symbol;
        private String type;
        private Double volume;
        private Double openPrice;
        private Double currentPrice;
        private Double sl;
        private Double tp;
        private Double profit;
        private Double swap;
        private Double commission;
        private String comment;
    }

    @Data
    public static class Mt5Deal {
        private Long ticket;
        private Long order;
        private String symbol;
        private String type;
        private String entry; // IN, OUT, INOUT
        private Double volume;
        private Double price;
        private Double profit;
        private Double commission;
        private Double swap;
        private Long time;
        private String comment;
        private Long positionId;
        private Integer reason;
    }

    @Data
    public static class OrderResponse {
        private boolean success;
        private String orderId;
        private String message;

        public OrderResponse() {
        }

        public OrderResponse(boolean success, String orderId, String message) {
            this.success = success;
            this.orderId = orderId;
            this.message = message;
        }
    }
}
