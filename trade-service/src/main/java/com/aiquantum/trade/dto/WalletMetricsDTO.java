package com.aiquantum.trade.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WalletMetricsDTO {
    private Double totalBalance;
    private Double totalPnl;
    private Double dailyPnl;
    private Double winRate;
    private Integer activeBots;
}
