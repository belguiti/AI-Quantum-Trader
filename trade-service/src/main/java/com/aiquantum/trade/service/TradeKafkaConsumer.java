package com.aiquantum.trade.service;

import com.aiquantum.trade.model.Trade;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class TradeKafkaConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    public TradeKafkaConsumer(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @KafkaListener(topics = "trade-topic", groupId = "trade-group")
    public void consumeTrade(Trade trade) {
        log.info("Received Trade from Kafka: {}", trade);
        // Push to WebSocket subscribers
        messagingTemplate.convertAndSend("/topic/trades", trade);
    }
}
