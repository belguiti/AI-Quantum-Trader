package com.aiquantum.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminStatsDTO {
    private long totalUsers;
    private long activeUsers;
    private long bannedUsers;
    private long proSubscriptions;
    private long freeSubscriptions;
    private long trialSubscriptions;
    // Trade stats (fetched from trade-service)
    private long trades24h;
    private double platformNetPnl;
    // Charts
    private List<Map<String, Object>> userGrowth; // [{date, count}]
    private List<Map<String, Object>> symbolBreakdown; // [{symbol, count, percentage}]
}
