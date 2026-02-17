package com.aiquantum.trade.dto;

import lombok.Data;

@Data
public class TradeRequestDTO {
    private String symbol;
    private String action; // BUY, SELL
    private Double price;
    private Double quantity;
}
