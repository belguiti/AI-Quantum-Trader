package com.aiquantum.trade.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "exchange_accounts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExchangeAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String name; // e.g. "MT5 - 123456"

    private String broker;

    private String accountType;

    private String login;

    private String password; // In real app, encrypt this!

    private String server;

    private String path;

    private LocalDateTime lastConnectedAt;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
