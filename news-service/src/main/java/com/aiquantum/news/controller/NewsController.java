package com.aiquantum.news.controller;

import com.aiquantum.news.model.NewsItem;
import com.aiquantum.news.service.NewsService;
import com.aiquantum.news.service.SmartFeedService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/news")
@CrossOrigin(origins = "*") // Allow frontend access
public class NewsController {

    private final SmartFeedService smartFeedService;
    private final NewsService newsService; // Direct access if needed for triggering

    public NewsController(SmartFeedService smartFeedService, NewsService newsService) {
        this.smartFeedService = smartFeedService;
        this.newsService = newsService;
    }

    @GetMapping
    public List<NewsItem> getNews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return smartFeedService.getSmartFeed(page, size);
    }
    
    @PostMapping("/trigger-fetch")
    public String triggerFetch() {
        newsService.fetchAndProcessNews();
        return "Fetch triggered";
    }
}
