package com.aiquantum.trade.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiPredictionDTO {
    private double technical_confidence;
    private double sentiment_score;
    private double aggregate_score;
    private String action; // BUY | SELL | HOLD
    private String symbol; // e.g. BTCUSD
    private String reasoning; // Explanation of the signal
}
