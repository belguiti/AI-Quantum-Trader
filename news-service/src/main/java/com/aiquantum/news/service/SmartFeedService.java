package com.aiquantum.news.service;

import com.aiquantum.news.model.NewsItem;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SmartFeedService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;

    // Separate lists for priorities
    private static final String LIST_HIGH = "news:high";
    private static final String LIST_MEDIUM = "news:medium";
    private static final String LIST_LOW = "news:low";
    private static final String LIST_ALL = "news:all"; // Fallback/Timeline

    public SmartFeedService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper, SimpMessagingTemplate messagingTemplate) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.messagingTemplate = messagingTemplate;
    }

    @KafkaListener(topics = "market.news", groupId = "news_consumer_group")
    public void consumeNews(String message) {
        try {
            NewsItem item = objectMapper.readValue(message, NewsItem.class);
            saveToSmartLists(item);
            
            // Broadcast to WebSocket
            messagingTemplate.convertAndSend("/topic/news", item);
            
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
    }

    private void saveToSmartLists(NewsItem item) {
        String json;
        try {
            json = objectMapper.writeValueAsString(item);
        } catch (JsonProcessingException e) {
            return;
        }

        // Push to All (Timeline)
        redisTemplate.opsForList().leftPush(LIST_ALL, json);
        redisTemplate.opsForList().trim(LIST_ALL, 0, 500); // Keep last 500

        // Push to Priority Lists
        String targetList = switch (item.getPriority()) {
            case "HIGH" -> LIST_HIGH;
            case "MEDIUM" -> LIST_MEDIUM;
            case "LOW" -> LIST_LOW;
            default -> LIST_LOW;
        };
        
        redisTemplate.opsForList().leftPush(targetList, json);
        redisTemplate.opsForList().trim(targetList, 0, 200); // Keep last 200 per priority
    }

    /**
     * Smart Algorithm: 80% HIGH, 15% MEDIUM, 5% LOW
     */
    public List<NewsItem> getSmartFeed(int page, int size) {
        // Calculate distribution
        int highCount = (int) Math.ceil(size * 0.8);
        int mediumCount = (int) Math.ceil(size * 0.15);
        int lowCount = size - highCount - mediumCount;

        List<NewsItem> feed = new ArrayList<>();
        
        feed.addAll(fetchFromList(LIST_HIGH, page, highCount));
        feed.addAll(fetchFromList(LIST_MEDIUM, page, mediumCount));
        feed.addAll(fetchFromList(LIST_LOW, page, lowCount));

        // Sort by date (descending)
        feed.sort((a, b) -> b.getPublishedAt().compareTo(a.getPublishedAt()));
        
        return feed;
    }

    private List<NewsItem> fetchFromList(String key, int page, int count) {
        long start = (long) page * count;
        long end = start + count - 1;
        
        List<String> jsonItems = redisTemplate.opsForList().range(key, start, end);
        if (jsonItems == null) return new ArrayList<>();
        
        return jsonItems.stream().map(json -> {
            try {
                return objectMapper.readValue(json, NewsItem.class);
            } catch (JsonProcessingException e) {
                return null;
            }
        }).filter(java.util.Objects::nonNull).collect(Collectors.toList());
    }
}
