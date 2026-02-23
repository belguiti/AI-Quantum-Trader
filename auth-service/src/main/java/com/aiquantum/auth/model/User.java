package com.aiquantum.auth.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String username;

    @Column(name = "wallet_balance")
    private BigDecimal walletBalance;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(name = "mt5_connected")
    private boolean mt5Connected;

    @Column(name = "mt5_base_url")
    private String mt5BaseUrl;

    @Column(name = "wallet_address")
    private String walletAddress;

    @Column(name = "is_active", nullable = false, columnDefinition = "bit NOT NULL DEFAULT 1")
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_plan", nullable = false, columnDefinition = "varchar(50) NOT NULL DEFAULT 'FREE'")
    private SubscriptionPlan subscriptionPlan = SubscriptionPlan.FREE;

    @Column(name = "data_usage", nullable = false, columnDefinition = "int NOT NULL DEFAULT 0")
    private int dataUsage = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, columnDefinition = "varchar(50) NOT NULL DEFAULT 'TRIAL'")
    private PaymentStatus paymentStatus = PaymentStatus.TRIAL;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (walletBalance == null) {
            walletBalance = BigDecimal.ZERO;
        }
        if (role == null) {
            role = Role.USER;
        }
        active = true;
        if (subscriptionPlan == null)
            subscriptionPlan = SubscriptionPlan.FREE;
        if (paymentStatus == null)
            paymentStatus = PaymentStatus.TRIAL;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    public enum Role {
        USER,
        ADMIN
    }

    public enum SubscriptionPlan {
        FREE,
        PRO
    }

    public enum PaymentStatus {
        ACTIVE,
        FAILED,
        TRIAL
    }
}
