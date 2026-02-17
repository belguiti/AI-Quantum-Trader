package com.aiquantum.trade.dto;

import lombok.Data;
import java.util.List;

@Data
public class BotConfigurationDTO {
    private Long id;
    private String configName;
    private String mode; // MANUAL | AUTO
    private boolean active;
    private String selectedStrategy; // NEURAL_LEARNER | RSI_SCALPER | TREND_FOLLOWER | ENSEMBLE

    private AiParameters aiParameters;
    private RiskParameters riskParameters;
    private ExecutionParameters executionParameters;
    private ConnectivityParameters connectivity;

    @Data
    public static class AiParameters {
        private Integer lookbackPeriod;
        private Double confidenceThreshold; // 0.0..1.0
    }

    @Data
    public static class RiskParameters {
        private Double stopLossPercentage;
        private Double takeProfitPercentage;
        private String riskRewardRatio; // "1:1.5"
        private Integer maxOpenTrades;
        private Double riskPerTradePct; // default 1.0
        private Double maxDailyLossPct; // default 5.0
        private Integer cooldownMinutesAfterLoss; // default 0
    }

    @Data
    public static class ExecutionParameters {
        private List<String> symbols;
        private String timeframe; // M1|M5|M15|M30|H1|H4|D1
        private boolean allowShort;
    }

    @Data
    public static class ConnectivityParameters {
        private String accountType; // DEMO | REAL
        private Long mt5Login;
        private String mt5Password; // never returned in GET, only for setting
        private String mt5Server;
        private String mt5Path; // Path to terminal64.exe
        private String mt5ConnectorBaseUrl; // default http://localhost:5005
        private String aiEngineBaseUrl; // default http://localhost:8000
        private boolean enableAiModel;
    }
}
