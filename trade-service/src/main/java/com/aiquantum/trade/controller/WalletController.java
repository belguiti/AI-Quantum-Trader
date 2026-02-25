package com.aiquantum.trade.controller;

import com.aiquantum.trade.dto.MarketAssetOverviewDTO;
import com.aiquantum.trade.dto.WalletMetricsDTO;
import com.aiquantum.trade.service.Mt5ConnectorClient;
import com.aiquantum.trade.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*") // In production configure properly
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/metrics")
    public ResponseEntity<WalletMetricsDTO> getWalletMetrics() {
        return ResponseEntity.ok(walletService.getWalletMetrics());
    }

    @GetMapping("/market/overview")
    public ResponseEntity<List<MarketAssetOverviewDTO>> getMarketOverview() {
        return ResponseEntity.ok(walletService.getMarketOverview());
    }

    @GetMapping("/trade/live-positions")
    public ResponseEntity<List<Mt5ConnectorClient.Mt5Position>> getLivePositions() {
        return ResponseEntity.ok(walletService.getLivePositions());
    }

    @PostMapping("/trade/close/{ticket}")
    public ResponseEntity<Mt5ConnectorClient.OrderResponse> closeTrade(@PathVariable Long ticket) {
        return ResponseEntity.ok(walletService.closeTrade(ticket));
    }
}
