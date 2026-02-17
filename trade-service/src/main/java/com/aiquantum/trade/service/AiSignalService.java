package com.aiquantum.trade.service;

import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.model.TrainedModel;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.TrainedModelRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiSignalService {

    private final BotConfigurationRepository botConfigRepository;
    private final TrainedModelRepository trainedModelRepository;
    private final Mt5ConnectorClient mt5Client;
    private final TradeExecutionService tradeExecutionService;
    private final com.aiquantum.trade.repository.OpportunityRepository opportunityRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final org.springframework.context.ApplicationContext applicationContext;

    private final String PYTHON_SERVICE_URL = "http://localhost:8002/lab/predict";

    // Run every 1 minute
    @Scheduled(fixedRate = 60000)
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public void generateSignals() {
        log.info("⏰ AI Signal Service Heartbeat: Checking for trading opportunities...");

        List<BotConfiguration> activeBots = botConfigRepository.findAll();
        if (activeBots.isEmpty()) {
            log.warn("⚠️ No Bot Configurations found in database. AI Service is idle.");
            return;
        }

        AiSignalService self = applicationContext.getBean(AiSignalService.class);

        for (BotConfiguration bot : activeBots) {
            if (bot.getSymbols() == null || bot.getSymbols().isEmpty()) {
                log.debug("Bot {} has no symbols configured.", bot.getId());
                continue;
            }

            for (String symbol : bot.getSymbols()) {
                try {
                    // Process each symbol in its own transaction via proxy
                    self.processSymbol(bot, symbol);
                } catch (Exception e) {
                    log.error("Failed to process symbol {} for bot {}", symbol, bot.getId(), e);
                }
            }
        }
    }

    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void processSymbol(BotConfiguration bot, String symbol) {
        try {
            // 1. Check for Deployed Model
            TrainedModel model = null;
            if (bot.getSelectedModelId() != null) {
                model = trainedModelRepository.findById(bot.getSelectedModelId()).orElse(null);
            }

            if (model == null) {
                // Try exact match first
                model = findLatestModel(symbol);

                // If not found, try common variations
                if (model == null) {
                    if (symbol.contains("-")) {
                        // BTC-USD -> BTCUSD
                        model = findLatestModel(symbol.replace("-", ""));
                    } else if (symbol.length() > 3) {
                        // BTCUSD -> BTC-USD (heuristics)
                        String guess = symbol.substring(0, 3) + "-" + symbol.substring(3);
                        model = findLatestModel(guess);
                    }
                }
            }

            if (model == null) {
                log.info("ℹ️ No deployed AI Model found for {}. Skipping prediction. (Checked variants)", symbol);
                return;
            }

            // 2. Fetch Market Data (Candles)
            // Defaulting to H1 for now, or use model metadata if stored
            String timeframe = bot.getTimeframe() != null ? bot.getTimeframe() : "H1";

            // Create auth params for auto-reconnect
            var authParams = new com.aiquantum.trade.dto.BotConfigurationDTO.ConnectivityParameters();
            authParams.setMt5Login(bot.getMt5Login());
            authParams.setMt5Password(bot.getMt5Password());
            authParams.setMt5Server(bot.getMt5Server());
            authParams.setMt5Path(bot.getMt5Path());
            authParams.setAccountType(bot.getAccountType());
            authParams.setMt5ConnectorBaseUrl(bot.getMt5ConnectorBaseUrl());

            List<Mt5ConnectorClient.Candle> candles = mt5Client.getCandles(bot.getMt5ConnectorBaseUrl(), symbol,
                    timeframe, 100, authParams);

            if (candles.isEmpty()) {
                log.warn("⚠️ No candle data received for {} from MT5 Connector.", symbol);
                return;
            }

            // 3. Prepare Prediction Request
            Map<String, Object> params = objectMapper.readValue(model.getParameters(), Map.class);
            // Default indicators, or store in model
            List<String> indicators = List.of("RSI", "MACD");

            // Fetch Sentiment
            Double sentimentScore = 0.0;
            try {
                String sentimentUrl = "http://localhost:8086/api/news/sentiment/" + symbol;
                sentimentScore = restTemplate.getForObject(sentimentUrl, Double.class);
                if (sentimentScore == null)
                    sentimentScore = 0.0;
            } catch (Exception e) {
                log.warn("Failed to fetch sentiment for {}, defaulting to neutral", symbol);
            }

            Map<String, Object> request = Map.of(
                    "symbol", symbol,
                    "marketData", candles,
                    "indicators", indicators,
                    "params", params,
                    "newsSentiment", sentimentScore);

            // 4. Call Python Inference
            Map<String, Object> response = restTemplate.postForObject(PYTHON_SERVICE_URL, request, Map.class);

            if (response != null && ("BUY".equals(response.get("signal")) || "SELL".equals(response.get("signal")))) {
                String signal = (String) response.get("signal");
                Double confidence = (response.get("confidence") instanceof Number)
                        ? ((Number) response.get("confidence")).doubleValue()
                        : 0.0;
                String reason = (String) response.get("reason");

                log.info("AI Signal Generated: {} {} (Conf: {}) - {}", symbol, signal, confidence, reason);

                // 5. Create Opportunity
                Opportunity opp = new Opportunity();
                opp.setSymbol(symbol);
                opp.setSide(signal);
                opp.setConfidence(confidence);

                // data.price extraction safely
                Map<String, Object> dataPart = (Map<String, Object>) response.get("data");
                if (dataPart != null && dataPart.containsKey("price")) {
                    opp.setEntryPrice(((Number) dataPart.get("price")).doubleValue());
                } else {
                    opp.setEntryPrice(0.0); // Should not happen
                }

                // Calculate SL/TP based on model params (percent)
                double price = opp.getEntryPrice();
                Object slObj = params.get("stop_loss");
                Object tpObj = params.get("take_profit");

                double slPct = (slObj instanceof Number) ? ((Number) slObj).doubleValue() : 1.0;
                double tpPct = (tpObj instanceof Number) ? ((Number) tpObj).doubleValue() : 2.0;

                if ("BUY".equals(signal)) {
                    opp.setSl(price * (1 - slPct / 100));
                    opp.setTp(price * (1 + tpPct / 100));
                } else {
                    opp.setSl(price * (1 + slPct / 100));
                    opp.setTp(price * (1 - tpPct / 100));
                }

                opp.setStatus("PENDING");
                opp.setSource("AI_LAB_MODEL_" + model.getId());

                // Set AI explanation and sentiment
                opp.setStrategyBreakdown(reason);
                opp.setSentimentScore(sentimentScore);

                // Save Opportunity (Generates ID)
                opp = opportunityRepository.save(opp);

                // 6. Execute (Risk Review)
                tradeExecutionService.processOpportunity(opp, bot);
            }

        } catch (Exception e) {
            log.error("Error processing signals for {}", symbol, e);
            throw new RuntimeException("Error processing symbol " + symbol, e);
        }
    }

    private TrainedModel findLatestModel(String symbol) {
        String cleanSymbol = symbol.trim().toUpperCase();

        // 1. Exact match
        List<TrainedModel> models = trainedModelRepository
                .findBySymbolAndIsDeployedTrueOrderByTrainingDateDesc(cleanSymbol);

        if (!models.isEmpty()) {
            log.debug("Found exact model match for {}", cleanSymbol);
            return models.get(0);
        }

        // 2. Strip suffix (e.g. GBPUSD.m -> GBPUSD, GBPUSD_micro -> GBPUSD)
        // Regex: Replace dot or underscore followed by any chars at end
        String stripped = cleanSymbol.replaceAll("[._].*$", "");
        if (!stripped.equals(cleanSymbol)) {
            log.debug("Looking for stripped model symbol: {} (original: {})", stripped, cleanSymbol);
            models = trainedModelRepository.findBySymbolAndIsDeployedTrueOrderByTrainingDateDesc(stripped);
            if (!models.isEmpty())
                return models.get(0);
        }

        // 3. Try standard variations
        if (cleanSymbol.contains("-")) {
            String noDash = cleanSymbol.replace("-", "");
            models = trainedModelRepository.findBySymbolAndIsDeployedTrueOrderByTrainingDateDesc(noDash);
            if (!models.isEmpty())
                return models.get(0);
        } else if (cleanSymbol.length() > 3 && !cleanSymbol.contains("-")) {
            // Basic heuristic for Forex/Crypto matches
            // e.g. BTCUSD -> BTC-USD
            // But be careful not to break Stocks (AAPL)
            // Try split only if length is 6 (Forex)
            if (cleanSymbol.length() == 6) {
                String dashed = cleanSymbol.substring(0, 3) + "-" + cleanSymbol.substring(3);
                models = trainedModelRepository.findBySymbolAndIsDeployedTrueOrderByTrainingDateDesc(dashed);
                if (!models.isEmpty())
                    return models.get(0);
            }
        }

        return null;
    }
}
