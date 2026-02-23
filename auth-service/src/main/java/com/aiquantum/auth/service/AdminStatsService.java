package com.aiquantum.auth.service;

import com.aiquantum.auth.dto.AdminStatsDTO;
import com.aiquantum.auth.dto.AdminUserDTO;
import com.aiquantum.auth.model.User;
import com.aiquantum.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminStatsService {

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    private static final String TRADE_SERVICE_URL = "http://localhost:8081";

    public AdminStatsDTO getStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByActiveTrue();
        long bannedUsers = userRepository.countByActiveFalse();
        long proSubs = userRepository.countBySubscriptionPlan(User.SubscriptionPlan.PRO);
        long freeSubs = userRepository.countBySubscriptionPlan(User.SubscriptionPlan.FREE);
        long trialSubs = userRepository.countByPaymentStatus(User.PaymentStatus.TRIAL);

        // User growth last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<Object[]> growthRaw = userRepository.getUserGrowthSince(thirtyDaysAgo);
        List<Map<String, Object>> userGrowth = new ArrayList<>();
        for (Object[] row : growthRaw) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("date", row[0] != null ? row[0].toString() : "");
            entry.put("count", row[1] != null ? ((Number) row[1]).longValue() : 0L);
            userGrowth.add(entry);
        }

        // Fetch trade stats from trade-service
        long trades24h = 0;
        double netPnl = 0.0;
        List<Map<String, Object>> symbolBreakdown = new ArrayList<>();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> tradeStats = restTemplate.getForObject(
                    TRADE_SERVICE_URL + "/api/admin/trade-stats", Map.class);
            if (tradeStats != null) {
                trades24h = tradeStats.containsKey("trades24h")
                        ? ((Number) tradeStats.get("trades24h")).longValue()
                        : 0;
                netPnl = tradeStats.containsKey("platformNetPnl")
                        ? ((Number) tradeStats.get("platformNetPnl")).doubleValue()
                        : 0.0;
                if (tradeStats.containsKey("symbolBreakdown")) {
                    symbolBreakdown = (List<Map<String, Object>>) tradeStats.get("symbolBreakdown");
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch trade stats from trade-service: {}", e.getMessage());
        }

        return AdminStatsDTO.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .bannedUsers(bannedUsers)
                .proSubscriptions(proSubs)
                .freeSubscriptions(freeSubs)
                .trialSubscriptions(trialSubs)
                .trades24h(trades24h)
                .platformNetPnl(netPnl)
                .userGrowth(userGrowth)
                .symbolBreakdown(symbolBreakdown)
                .build();
    }

    public List<AdminUserDTO> getAllUsers() {
        return userRepository.findAll().stream().map(u -> AdminUserDTO.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .createdAt(u.getCreatedAt())
                .isActive(u.isActive())
                .subscriptionPlan(u.getSubscriptionPlan().name())
                .paymentStatus(u.getPaymentStatus().name())
                .dataUsage(u.getDataUsage())
                .role(u.getRole().name())
                .build()).toList();
    }

    public AdminUserDTO toggleBan(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        user.setActive(!user.isActive());
        userRepository.save(user);
        return getAllUsers().stream().filter(u -> u.getId().equals(userId)).findFirst().orElseThrow();
    }

    public AdminUserDTO updateSubscription(Long userId, String plan, String paymentStatus) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        if (plan != null)
            user.setSubscriptionPlan(User.SubscriptionPlan.valueOf(plan));
        if (paymentStatus != null)
            user.setPaymentStatus(User.PaymentStatus.valueOf(paymentStatus));
        userRepository.save(user);
        return getAllUsers().stream().filter(u -> u.getId().equals(userId)).findFirst().orElseThrow();
    }

    public void resetDataUsage(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        user.setDataUsage(0);
        userRepository.save(user);
    }
}
