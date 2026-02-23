package com.aiquantum.trade.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;

/**
 * DTO returned by the Targeted AI Scan endpoint.
 * Contains the AI's prediction, confidence, reasoning, and suggested trade
 * setup.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanResultDTO {
    private String symbol;
    private String action; // BUY, SELL, HOLD
    private double confidence; // 0.0 - 1.0
    private String mainIdea; // Human-readable reasoning from feature importance
    private double entryPrice;
    private double sl; // Suggested Stop Loss
    private double tp; // Suggested Take Profit
    private Map<String, Double> probabilities; // {hold: 0.10, buy: 0.08, sell: 0.82}
    private Map<String, Double> featureImportance; // {ADX: 0.35, RSI: 0.25, ...}
}
