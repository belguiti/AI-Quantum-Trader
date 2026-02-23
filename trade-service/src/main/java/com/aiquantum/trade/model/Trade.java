package com.aiquantum.trade.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "trades")
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;
    private String symbol;
    private String side; // BUY, SELL

    private Double entryPrice;
    private Double exitPrice;
    private Double quantity;
    private Double sl;
    private Double tp;

    private Double pnl;

    private LocalDateTime entryTime;
    private LocalDateTime exitTime;

    private String status; // PENDING, OPEN, CLOSED, FAILED
    private String externalOrderId;
    private String strategyBreakdown;

    private Double predictedWinProbability;

    private Long opportunityId; // Link back to the signal
}
