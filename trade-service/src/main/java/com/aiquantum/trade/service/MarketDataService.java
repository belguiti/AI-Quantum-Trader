package com.aiquantum.trade.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class MarketDataService {

    private static final String BINANCE_WS_URL = "wss://stream.binance.com:9443/ws";
    // Top 30+ coins for pagination
    private static final String[] SYMBOLS = {
            "btcusdt", "ethusdt", "bnbusdt", "solusdt", "xrpusdt", "adausdt", "dogeusdt", "dotusdt",
            "maticusdt", "ltcusdt", "trxusdt", "avaxusdt", "shibusdt", "atomusdt", "linkusdt",
            "uniusdt", "xlmusdt", "nearusdt", "filusdt", "hbarusdt", "vetusdt", "icpusdt", "grtusdt",
            "aaveusdt", "algousdt", "axsusdt", "sandusdt", "thetausdt", "eosusdt", "ftmusdt"
    };

    // Approximate Circulating Supplies (2025 proj. or current) for Market Cap Calc
    private static final Map<String, Double> CIRCULATING_SUPPLY = new java.util.HashMap<>();
    static {
        CIRCULATING_SUPPLY.put("BTCUSDT", 19_800_000.0);
        CIRCULATING_SUPPLY.put("ETHUSDT", 120_000_000.0);
        CIRCULATING_SUPPLY.put("BNBUSDT", 140_000_000.0);
        CIRCULATING_SUPPLY.put("SOLUSDT", 480_000_000.0);
        CIRCULATING_SUPPLY.put("XRPUSDT", 58_000_000_000.0);
        CIRCULATING_SUPPLY.put("ADAUSDT", 36_500_000_000.0);
        CIRCULATING_SUPPLY.put("DOGEUSDT", 147_000_000_000.0);
        CIRCULATING_SUPPLY.put("DOTUSDT", 1_500_000_000.0);
        CIRCULATING_SUPPLY.put("MATICUSDT", 10_000_000_000.0);
        CIRCULATING_SUPPLY.put("LTCUSDT", 75_000_000.0);
        CIRCULATING_SUPPLY.put("TRXUSDT", 87_000_000_000.0);
        CIRCULATING_SUPPLY.put("AVAXUSDT", 400_000_000.0);
        CIRCULATING_SUPPLY.put("SHIBUSDT", 589_000_000_000_000.0);
        CIRCULATING_SUPPLY.put("ATOMUSDT", 390_000_000.0);
        CIRCULATING_SUPPLY.put("LINKUSDT", 600_000_000.0);
        CIRCULATING_SUPPLY.put("UNIUSDT", 600_000_000.0);
        CIRCULATING_SUPPLY.put("XLMUSDT", 29_000_000_000.0);
        CIRCULATING_SUPPLY.put("NEARUSDT", 1_100_000_000.0);
        CIRCULATING_SUPPLY.put("FILUSDT", 550_000_000.0);
        CIRCULATING_SUPPLY.put("HBARUSDT", 33_000_000_000.0);
        CIRCULATING_SUPPLY.put("VETUSDT", 72_000_000_000.0);
        CIRCULATING_SUPPLY.put("ICPUSDT", 470_000_000.0);
        CIRCULATING_SUPPLY.put("GRTUSDT", 10_000_000_000.0);
        CIRCULATING_SUPPLY.put("AAVEUSDT", 14_800_000.0);
        CIRCULATING_SUPPLY.put("ALGOUSDT", 8_200_000_000.0);
        CIRCULATING_SUPPLY.put("AXSUSDT", 140_000_000.0);
        CIRCULATING_SUPPLY.put("SANDUSDT", 2_300_000_000.0);
        CIRCULATING_SUPPLY.put("THETAUSDT", 1_000_000_000.0);
        CIRCULATING_SUPPLY.put("EOSUSDT", 1_100_000_000.0);
        CIRCULATING_SUPPLY.put("FTMUSDT", 2_800_000_000.0);
    }

    private final OkHttpClient client;
    private final ObjectMapper objectMapper;
    private WebSocket webSocket;

    // Store latest prices: Symbol -> Price
    private final Map<String, Double> priceCache = new ConcurrentHashMap<>();

    private final SimpMessagingTemplate messagingTemplate;

    public MarketDataService(SimpMessagingTemplate messagingTemplate) {
        this.client = new OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build();
        this.objectMapper = new ObjectMapper();
        this.messagingTemplate = messagingTemplate;
    }

    @PostConstruct
    public void connect() {
        Request request = new Request.Builder()
                .url(buildStreamUrl())
                .build();

        webSocket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                log.info("Connected to Binance Market Data Stream");
            }

            @Override
            public void onMessage(WebSocket webSocket, String text) {
                try {
                    // Binance Mini Ticker Array Format:
                    // [{"e":"24hrMiniTicker","E":1672515782136,"s":"BTCUSDT","c":"16550.00","o":"16500.00","h":"16600.00","l":"16400.00","v":"1000","q":"10000000"}]
                    JsonNode node = objectMapper.readTree(text);
                    if (node.isArray()) {
                        for (JsonNode ticker : node) {
                            String symbol = ticker.get("s").asText();
                            if (symbol.endsWith("USDT")) {
                                double price = ticker.get("c").asDouble();
                                double open = ticker.get("o").asDouble();
                                double changePercent = (open != 0) ? ((price - open) / open) * 100 : 0.0;
                                double volume = ticker.get("q").asDouble(); // Quote volume

                                priceCache.put(symbol, price);

                                double supply = CIRCULATING_SUPPLY.getOrDefault(symbol, 0.0);
                                double marketCap = price * supply;

                                // Fallback for market cap if supply is unknown: estimate based on volume (Just
                                // for sorting demo if needed, but better to stick to 0)
                                // actually, let's just send what we have.

                                Map<String, Object> priceUpdate = Map.of(
                                        "symbol", symbol,
                                        "price", price,
                                        "change", changePercent,
                                        "volume", volume,
                                        "marketCap", marketCap,
                                        "timestamp", System.currentTimeMillis());
                                messagingTemplate.convertAndSend("/topic/prices", priceUpdate);
                            }
                        }
                    } else if (node.has("p") && node.has("s")) {
                        // Fallback for single trade if needed, or just ignore
                    }
                } catch (Exception e) {
                    log.error("Error parsing market data: {}", e.getMessage());
                }
            }

            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                log.error("Binance Stream Failure", t);
                // Simple reconnect strategy could be added here
            }

            @Override
            public void onClosed(WebSocket webSocket, int code, String reason) {
                log.info("Binance Stream Closed: {} {}", code, reason);
            }
        });
    }

    private String buildStreamUrl() {
        // Subscribe to ALL Market Mini Tickers
        return "wss://stream.binance.com:9443/ws/!miniTicker@arr";
    }

    public Double getPrice(String symbol) {
        return priceCache.get(symbol.toUpperCase());
    }

    public Map<String, Double> getAllPrices() {
        return priceCache;
    }

    @PreDestroy
    public void disconnect() {
        if (webSocket != null) {
            webSocket.close(1000, "Service Shutdown");
        }
    }
}
