package com.aiquantum.trade.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "opportunities")
@Data
public class Opportunity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;
    private String symbol;
    private String side; // BUY/SELL
    private Double entryPrice;
    private Double sl;
    private Double tp;

    private Double predictedWinProbability;
    private Double confidence;

    @Column(length = 2000)
    private String strategyBreakdown;

    private String source; // e.g., AI_LAB_MODEL_123

    private Double sentimentScore;

    // Swing Trading Flag
    private Boolean isSwing;

    private LocalDateTime createdAt;

    private Long configVersion; // Logic tie to the config used

    // Status tracking for manual mode: PENDING, EXECUTED, REJECTED, EXPIRED
    private String status;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null)
            status = "PENDING";
    }
}
