package com.aiquantum.trade.dto;

import lombok.Data;
import java.util.List;

@Data
public class TrainingRequestDTO {
    private String symbol;
    private String startDate;
    private String endDate;
    private List<String> indicators;
    private double targetWinRate;
    private int trials;

    // Maps "sl_min" -> 0.5, etc.
    // Matches JSON key from frontend: "param_ranges"
    private java.util.Map<String, Double> param_ranges;

    // Engine selector: "OPTUNA" or "XGBOOST"
    private String engineType;
}
