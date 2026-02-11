package com.aiquantum.news.service;

import com.aiquantum.news.model.NewsItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class NewsProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final String TOPIC = "market.news";

    public NewsProducer(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void sendNews(NewsItem item) {
        try {
            String json = objectMapper.writeValueAsString(item);
            kafkaTemplate.send(TOPIC, item.getId(), json);
            System.out.println("Produce: Sent news to Kafka: " + item.getTitle());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
