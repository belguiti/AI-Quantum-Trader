package com.aiquantum.news.service;

import com.aiquantum.news.model.NewsItem;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NewsService {

    private final AiEnrichmentService aiEnrichmentService;
    private final RssFetcherService rssFetcherService;
    private final NewsProducer newsProducer;
    private final List<String> processedUrls = new ArrayList<>();

    public NewsService(AiEnrichmentService aiEnrichmentService, RssFetcherService rssFetcherService, NewsProducer newsProducer) {
        this.aiEnrichmentService = aiEnrichmentService;
        this.rssFetcherService = rssFetcherService;
        this.newsProducer = newsProducer;
    }

    // This method is now likely unused by Controller, as Controller uses SmartFeedService
    // But we keep it for reference or direct access if needed
    public List<NewsItem> getNews(String category) {
        return List.of(); // Placeholder
    }

    @Scheduled(fixedRate = 60000) // Every minute
    public void fetchAndProcessNews() {
        System.out.println("Fetching fresh news from RSS...");
        
        List<NewsItem> freshItems = rssFetcherService.fetchNews();
        
        for (NewsItem item : freshItems) {
            // Deduplication
            if (processedUrls.contains(item.getUrl())) {
                continue;
            }
            
            // Enrich with AI
            System.out.println("Enriching: " + item.getTitle());
            aiEnrichmentService.enrich(item);
            
            // Send to Kafka
            newsProducer.sendNews(item);
            
            processedUrls.add(item.getUrl());
            if (processedUrls.size() > 500) processedUrls.remove(0); 
        }
    }
}
