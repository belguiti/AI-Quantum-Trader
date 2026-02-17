package com.aiquantum.news.service;

import com.aiquantum.news.model.NewsItem;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class RssFetcherService {

    private static final Map<String, String> RSS_FEEDS = Map.of(
            "Yahoo Finance", "https://finance.yahoo.com/news/rssindex",
            "Yahoo Gold", "https://finance.yahoo.com/rss/headline?s=GC=F",
            "Reddit StockMarket", "https://www.reddit.com/r/StockMarket/.rss",
            "Mining.com Gold", "https://www.mining.com/commodity/gold/feed/");

    public List<NewsItem> fetchNews() {
        List<NewsItem> aggregatedItems = new ArrayList<>();

        RSS_FEEDS.forEach((source, url) -> {
            try {
                // Fetch each feed with User-Agent to avoid 403s
                URL feedUrl = new URL(url);
                java.net.URLConnection conn = feedUrl.openConnection();
                conn.setRequestProperty("User-Agent",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                SyndFeedInput input = new SyndFeedInput();
                SyndFeed feed = input.build(new XmlReader(conn.getInputStream()));

                int limit = 5; // Limit per source to avoid overload
                for (SyndEntry entry : feed.getEntries()) {
                    if (limit-- <= 0)
                        break;

                    NewsItem item = new NewsItem();
                    item.setId(UUID.randomUUID().toString());
                    item.setTitle(entry.getTitle());
                    item.setSummary(entry.getDescription() != null ? cleanHtml(entry.getDescription().getValue()) : "");
                    item.setUrl(entry.getLink());
                    item.setSource(source);

                    if (entry.getPublishedDate() != null) {
                        item.setPublishedAt(entry.getPublishedDate().toInstant()
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime());
                    } else {
                        item.setPublishedAt(LocalDateTime.now());
                    }

                    aggregatedItems.add(item);
                }
            } catch (Exception e) {
                System.err.println("Failed to fetch RSS from " + source + ": " + e.getMessage());
            }
        });

        return aggregatedItems;
    }

    private String cleanHtml(String html) {
        if (html == null)
            return "";
        return html.replaceAll("<[^>]*>", "").trim();
    }
}
