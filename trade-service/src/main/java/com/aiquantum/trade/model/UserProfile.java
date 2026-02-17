package com.aiquantum.trade.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {
    private String id;
    private String username;
    private String email;
    private String role; // ADMIN, TRADER
    private boolean mt5Connected;
    private String mt5BaseUrl;
}
