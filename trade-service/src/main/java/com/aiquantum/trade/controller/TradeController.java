package com.aiquantum.trade.controller;

import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.model.Trade;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.OpportunityRepository;
import com.aiquantum.trade.service.TradeExecutionService;
import com.aiquantum.trade.service.TradeService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

        private final TradeService tradeService;
        private final TradeExecutionService tradeExecutionService;
        private final BotConfigurationRepository botConfigurationRepository;
        private final OpportunityRepository opportunityRepository;
        private final com.aiquantum.trade.service.Mt5ConnectorClient mt5Client;
        private final com.aiquantum.trade.service.UserContextService userContextService;
        private final com.aiquantum.trade.service.TradeSyncService tradeSyncService;

        @PostMapping("/sync")
        public ResponseEntity<String> syncTrades() {
                tradeSyncService.syncAllTrades();
                return ResponseEntity.ok("Sync triggered");
        }

        @GetMapping("/live-positions")
        public ResponseEntity<java.util.List<com.aiquantum.trade.service.Mt5ConnectorClient.Mt5Position>> getLivePositions() {
                String userId = userContextService.getCurrentUserId();
                BotConfiguration config = botConfigurationRepository.findByUserIdAndActiveTrue(userId)
                                .orElse(new BotConfiguration());

                // 1. Fetch all open positions from MT5 (raw list)
                java.util.List<com.aiquantum.trade.service.Mt5ConnectorClient.Mt5Position> allPositions = mt5Client
                                .getOpenPositions(config.getMt5ConnectorBaseUrl());

                // 2. Fetch "EXECUTED" trades for this user from DB to get their Ticket IDs
                // (externalOrderId)
                java.util.List<Trade> userTrades = tradeService.getCheckTrades(userId);
                java.util.Set<String> userTicketIds = userTrades.stream()
                                .map(Trade::getExternalOrderId)
                                .filter(id -> id != null)
                                .collect(java.util.stream.Collectors.toSet());

                // 3. Filter MT5 positions
                java.util.List<com.aiquantum.trade.service.Mt5ConnectorClient.Mt5Position> filteredPositions = allPositions
                                .stream()
                                .filter(pos -> userTicketIds.contains(String.valueOf(pos.getTicket())))
                                .collect(java.util.stream.Collectors.toList());

                return ResponseEntity.ok(filteredPositions);
        }

        @GetMapping
        public ResponseEntity<Page<Trade>> getAllTrades(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size,
                        @RequestParam(required = false) String symbol) {

                String userId = userContextService.getCurrentUserId();
                PageRequest pageRequest = PageRequest.of(page, size);

                if (symbol != null && !symbol.isEmpty()) {
                        return ResponseEntity.ok(tradeService.getTradesBySymbol(userId, symbol, pageRequest));
                } else {
                        return ResponseEntity.ok(tradeService.getAllTrades(userId, pageRequest));
                        // Wait, TradeService needs update too or I can call repo directly?
                        // TradeService typically wraps repo. Let's check TradeService.
                        // For now, I'll assume I need to update TradeService first.
                }
        }

        // Manual Trade Request DTO
        @Data
        public static class ManualTradeRequest {
                private String symbol;
                private String action; // BUY/SELL
                private double price;
                private double quantity;
                private double sl;
                private double tp;
        }

        @PostMapping("/manual")
        public ResponseEntity<String> executeManualTrade(@RequestBody ManualTradeRequest request) {
                String userIdStr = userContextService.getCurrentUserId();

                // Fetch active config or use default
                BotConfiguration config = botConfigurationRepository.findByUserIdAndActiveTrue(userIdStr)
                                .orElse(new BotConfiguration());
                if (config.getUserId() == null)
                        config.setUserId(userIdStr);

                // Create an ad-hoc opportunity for the risk engine
                Opportunity opp = new Opportunity();
                opp.setUserId(userIdStr);
                opp.setSymbol(request.getSymbol());
                opp.setSide(request.getAction());
                opp.setEntryPrice(request.getPrice());
                opp.setSl(request.getSl());
                opp.setTp(request.getTp());
                opp.setPredictedWinProbability(1.0); // Manual override
                opp.setConfidence(1.0);
                opp.setStrategyBreakdown("MANUAL_USER_OVERRIDE");

                // Save opportunity first
                opportunityRepository.save(opp);

                // Execute via Risk Engine
                boolean approved = tradeExecutionService.processOpportunity(opp, config);

                if (approved) {
                        return ResponseEntity.ok("Manual Trade Sent to Execution");
                } else {
                        return ResponseEntity.badRequest().body("Manual Trade Rejected by Risk Engine");
                }
        }

        @GetMapping("/debug/statuses")
        public java.util.List<String> getStatuses() {
                return tradeService.getDistinctStatuses();
        }
}
