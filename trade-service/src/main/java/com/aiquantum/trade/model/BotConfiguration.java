package com.aiquantum.trade.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "bot_configuration")
@Data
public class BotConfiguration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    private boolean active;
    private Long version;
    private LocalDateTime createdAt;

    private String configName; // User-defined name

    // Config stored as massive JSON or flattened fields.
    // For SQL Server, and strict querying, flattened is better or JSON type if
    // supported.
    // Given the constraints and typical enterprise apps, we'll flatten critical
    // fields and JSON/Lob the rest,
    // or use a separate table for params.
    // For simplicity in this local dev phase, we will map clean fields.

    private String mode; // MANUAL | AUTO
    private String selectedStrategy;

    // AI Params
    private Integer aiLookbackPeriod;
    private Double aiConfidenceThreshold;

    // Risk Params
    private Double stopLossPercentage;
    private Double takeProfitPercentage;
    private String riskRewardRatio;
    private Integer maxOpenTrades;
    private Double riskPerTradePct;
    private Double maxDailyLossPct;
    private Integer cooldownMinutesAfterLoss;

    // Execution Params
    @ElementCollection
    @CollectionTable(name = "bot_config_symbols", joinColumns = @JoinColumn(name = "config_id"))
    @Column(name = "symbol")
    private List<String> symbols;

    private String timeframe;
    private boolean allowShort;

    // Connectivity
    private String accountType;
    private Long mt5Login;
    @Column(length = 500)
    private String mt5Password; // Encrypted
    private String mt5Server;
    private String mt5Path;
    private String mt5ConnectorBaseUrl;
    private String aiEngineBaseUrl;
    private boolean enableAiModel;

    private Long selectedModelId; // ID of the specific trained model to use

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
