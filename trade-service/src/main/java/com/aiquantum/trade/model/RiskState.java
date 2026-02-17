package com.aiquantum.trade.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "risk_state")
@Data
public class RiskState {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String userId;

    private Double dailyPnl;
    private LocalDateTime lastLossTime;
    private boolean circuitBreakerTripped;
    private LocalDateTime lastReset;

    @PrePersist
    protected void onCreate() {
        if (lastReset == null)
            lastReset = LocalDateTime.now();
    }
}
