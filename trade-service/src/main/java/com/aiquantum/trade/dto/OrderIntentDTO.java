package com.aiquantum.trade.dto;

import lombok.Data;

@Data
public class OrderIntentDTO {
    private String opportunityId; // Link back
    private String userId;
    private String symbol;
    private String side;
    private Double quantity;
    private Double sl;
    private Double tp;
    private String comment;

    // Config needed for execution context (like baseUrl)
    private String mt5BaseUrl;
}
