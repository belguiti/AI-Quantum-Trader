package com.aiquantum.trade.service;

import com.aiquantum.trade.model.Trade;
import com.aiquantum.trade.repository.TradeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
@Slf4j
public class TradeService {

    private final TradeRepository tradeRepository;
    private final MarketDataService marketDataService;
    private final KafkaTemplate<String, Trade> kafkaTemplate;

    public TradeService(TradeRepository tradeRepository,
            MarketDataService marketDataService,
            KafkaTemplate<String, Trade> kafkaTemplate) {
        this.tradeRepository = tradeRepository;
        this.marketDataService = marketDataService;
        this.kafkaTemplate = kafkaTemplate;
    }

    public Page<Trade> getAllTrades(Pageable pageable) {
        return tradeRepository.findAll(pageable);
    }

    public Trade placeTrade(Trade trade) {
        // 1. Get Real-time Price if not set (Market Order simulation)
        Double currentPrice = marketDataService.getPrice(trade.getSymbol());
        if (currentPrice != null) {
            trade.setPrice(currentPrice);
        } else {
            log.warn("Price not available for {}, using default/requested price", trade.getSymbol());
        }

        // 2. Set Metadata
        trade.setTimestamp(LocalDateTime.now());
        trade.setStatus(Trade.TradeStatus.EXECUTED); // Simulating instant execution for now

        // 3. Save to DB
        Trade savedTrade = tradeRepository.save(trade);

        // 4. Publish to Kafka
        kafkaTemplate.send("trade-topic", savedTrade);
        log.info("Trade placed and published to Kafka: {}", savedTrade);

        return savedTrade;
    }
}
