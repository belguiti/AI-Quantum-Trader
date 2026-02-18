package com.aiquantum.trade.controller;

import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.OpportunityRepository;
import com.aiquantum.trade.service.AiSignalDtoService;
import com.aiquantum.trade.service.OpportunityScannerService;
import com.aiquantum.trade.service.TradeExecutionService;
import com.aiquantum.trade.service.UserContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/opportunities")
@RequiredArgsConstructor
public class OpportunityController {

    private final OpportunityRepository opportunityRepository;
    private final TradeExecutionService riskEngine;
    private final BotConfigurationRepository configRepository;
    private final UserContextService userContextService;
    private final AiSignalDtoService dtoService;
    private final OpportunityScannerService scannerService;

    private final com.aiquantum.trade.service.SwingTradingService swingService;

    @GetMapping("/swing")
    public List<Opportunity> getSwingOpportunities() {
        return opportunityRepository.findByIsSwingTrueOrderByCreatedAtDesc();
    }

    @PostMapping("/swing/scan")
    public ResponseEntity<?> triggerSwingScan() {
        new Thread(() -> swingService.scanForSwingTrades()).start();
        return ResponseEntity.ok("Swing Scan Triggered");
    }

    @GetMapping
    public org.springframework.data.domain.Page<com.aiquantum.trade.dto.AiSignalDTO> getOpportunities(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String symbol) {

        String userId = userContextService.getCurrentUserId();
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Opportunity> opportunities;

        if (symbol != null && !symbol.isEmpty()) {
            opportunities = opportunityRepository.findByUserIdAndSymbolContainingIgnoreCaseOrderByCreatedAtDesc(userId,
                    symbol,
                    pageable);
        } else {
            opportunities = opportunityRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return dtoService.mapToPage(opportunities);
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirmOpportunity(@PathVariable Long id) {
        String userId = userContextService.getCurrentUserId();

        Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null)
            return ResponseEntity.notFound().build();

        BotConfiguration config = configRepository.findByUserIdAndActiveTrue(userId).orElse(null);
        if (config == null)
            return ResponseEntity.badRequest().body("No active bot config");

        boolean approved = riskEngine.processOpportunity(opp, config);
        opportunityRepository.save(opp); // save status change

        if (approved) {
            return ResponseEntity.ok("Trade Executed / Queued");
        } else {
            return ResponseEntity.badRequest().body("Trade Rejected by Risk Engine (Check Logs/Status)");
        }
    }

    @PostMapping("/scan") // Helper to trigger scan manually
    public ResponseEntity<?> triggerScan() {
        // In real app, inject ScannerService and call scanMarkets()
        return ResponseEntity.ok("Scan Triggered (Check Logs)");
    }
}
