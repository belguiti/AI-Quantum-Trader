package com.aiquantum.trade.dto;

import lombok.Data;

@Data
public class ConnectivityTestResultDTO {
    private boolean mt5Connected;
    private Integer mt5LatencyMs;
    private String mt5Message;
    private String mt5AccountInfo; // Login ID or "Demo"

    private boolean aiConnected;
    private Integer aiLatencyMs;
    private String aiMessage;
}
