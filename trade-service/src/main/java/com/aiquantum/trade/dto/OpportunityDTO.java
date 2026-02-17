package com.aiquantum.trade.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class OpportunityDTO {
    private Long id;
    private String userId;
    private String symbol;
    private String side; // BUY/SELL
    private Double entryPrice;
    private Double sl;
    private Double tp;
    private Double predictedWinProbability; // 0..1
    private Double confidence; // 0..1
    private String strategyBreakdown; // explain why
    private Double sentimentScore;
    private LocalDateTime createdAt;
    private Long configVersion;
}
