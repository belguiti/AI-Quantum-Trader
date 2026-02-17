package com.aiquantum.trade.dto;

public enum RiskRewardRatio {
    RATIO_1_1_5("1:1.5"),
    RATIO_1_2("1:2"),
    RATIO_1_3("1:3");

    private final String value;

    RiskRewardRatio(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
