package com.aiquantum.trade.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "trades")
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String symbol;

    @Enumerated(EnumType.STRING)
    private TradeAction action;

    private Double price;
    private Double quantity;
    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    private TradeStatus status;

    public enum TradeAction {
        BUY, SELL
    }

    public enum TradeStatus {
        PENDING, EXECUTED, FAILED
    }
}
