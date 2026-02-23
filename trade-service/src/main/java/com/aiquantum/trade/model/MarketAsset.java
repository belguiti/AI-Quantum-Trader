package com.aiquantum.trade.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "market_assets")
@Data
public class MarketAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String symbol; // Standard symbol e.g. "BTCUSD", "XAUUSD"

    private String brokerSymbol; // e.g. "BTCUSD.m", "XAUUSD"

    @Enumerated(EnumType.STRING)
    private AssetClass assetClass;

    private boolean isActive;

    public enum AssetClass {
        CRYPTO, FOREX, INDEX, COMMODITY, STOCK
    }
}
