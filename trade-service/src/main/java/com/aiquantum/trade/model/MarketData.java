package com.aiquantum.trade.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MarketData {
    private String symbol;
    private Double open;
    private Double close;
    private Double high;
    private Double low;
    private Double volume;
    private LocalDateTime timestamp;

    // For ta4j integration, we might need methods to convert to Bar later
}
