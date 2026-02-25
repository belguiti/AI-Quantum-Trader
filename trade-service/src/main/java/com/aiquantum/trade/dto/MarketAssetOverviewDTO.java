package com.aiquantum.trade.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class MarketAssetOverviewDTO {
    private String symbol;
    private Double currentPrice;
    private Double dailyChangePercent;
    private List<Double> sparklineData;
}
