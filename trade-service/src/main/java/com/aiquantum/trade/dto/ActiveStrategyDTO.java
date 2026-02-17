package com.aiquantum.trade.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ActiveStrategyDTO {
    private Long modelId;
    private String symbol;
    private String name; // e.g. "RSI-MACD-OPT-v1"
    private int totalSignals;
    private double winRate; // From training
    private double expectedReturn; // From training
    private String status; // ACTIVE, PAUSED
    private LocalDateTime deployedAt;

    // Reasoning
    private String lastSignalReasoning;
    private Double lastSignalSentiment;
}
