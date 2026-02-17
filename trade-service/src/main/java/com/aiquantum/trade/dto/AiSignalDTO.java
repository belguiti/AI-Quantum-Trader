package com.aiquantum.trade.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AiSignalDTO {
    // Opportunity Details
    private Long id;
    private String symbol;
    private String side;
    private Double entryPrice;
    private Double sl;
    private Double tp;
    private Double confidence;
    private String strategyBreakdown; // Reason
    private LocalDateTime createdAt;
    private String status; // PENDING, EXECUTED, REJECTED

    // Trade Outcome (if executed)
    private Double exitPrice;
    private Double pnl;
    private LocalDateTime exitTime;
    private String tradeStatus; // OPEN, CLOSED, FAILED
}
