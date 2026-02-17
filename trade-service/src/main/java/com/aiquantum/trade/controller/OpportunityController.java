package com.aiquantum.trade.controller;

import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.OpportunityRepository;
import com.aiquantum.trade.service.TradeExecutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/opportunities")
@RequiredArgsConstructor
public class OpportunityController {

    private final OpportunityRepository repository;
    private final TradeExecutionService riskEngine;
    private final BotConfigurationRepository configRepository;
    private final com.aiquantum.trade.service.UserContextService userContextService;
    private final com.aiquantum.trade.service.AiSignalDtoService dtoService;

    @GetMapping
    public org.springframework.data.domain.Page<com.aiquantum.trade.dto.AiSignalDTO> getOpportunities(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String symbol) {

        String userId = userContextService.getCurrentUserId();
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Opportunity> opportunities;

        if (symbol != null && !symbol.isEmpty()) {
            opportunities = repository.findByUserIdAndSymbolContainingIgnoreCaseOrderByCreatedAtDesc(userId, symbol,
                    pageable);
        } else {
            opportunities = repository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return dtoService.mapToPage(opportunities);
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirmOpportunity(@PathVariable Long id) {
        String userId = userContextService.getCurrentUserId();

        Opportunity opp = repository.findById(id).orElse(null);
        if (opp == null)
            return ResponseEntity.notFound().build();

        BotConfiguration config = configRepository.findByUserIdAndActiveTrue(userId).orElse(null);
        if (config == null)
            return ResponseEntity.badRequest().body("No active bot config");

        boolean approved = riskEngine.processOpportunity(opp, config);
        repository.save(opp); // save status change

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
