package com.aiquantum.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminUserDTO {
    private Long id;
    private String username;
    private String email;
    private LocalDateTime createdAt;
    private boolean isActive;
    private String subscriptionPlan;
    private String paymentStatus;
    private int dataUsage;
    private String role;
    // Trade stats (populated separately)
    private long totalTrades;
    private double winRate;
    private double totalProfit;
}
