package com.aiquantum.news.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NewsItem {
    private String id;
    private String title;
    private String summary;
    private String source;
    private LocalDateTime publishedAt;
    private String category; // FINANCE, CRYPTO, etc.
    private String priority; // HIGH, MEDIUM, LOW
    private String sentiment; // BULLISH, BEARISH, NEUTRAL
    private String url;
}
