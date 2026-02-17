package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.OrderIntentDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public void sendOrderIntent(OrderIntentDTO orderIntent) {
        log.info("Sending order intent to Kafka: {}", orderIntent);
        try {
            String json = objectMapper.writeValueAsString(orderIntent);
            kafkaTemplate.send("order.intent", orderIntent.getUserId(), json);
        } catch (Exception e) {
            log.error("Failed to serialize order intent", e);
        }
    }
}
