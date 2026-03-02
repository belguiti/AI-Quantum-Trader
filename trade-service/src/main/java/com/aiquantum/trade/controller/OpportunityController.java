package com.aiquantum.trade.controller;

import com.aiquantum.trade.dto.AiSignalDTO;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
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

    // ═══════════════════════════════════════════════
    // SWING TRADING ENDPOINTS
    // ═══════════════════════════════════════════════

    /**
     * Endpoint A: Today's Active Swing Setups.
     * GET /api/swing/today
     * Returns all ACTIVE swing signals created within the current day.
     */
    @GetMapping("/swing/today")
    public List<AiSignalDTO> getTodaySwingSetups() {
        // Swing signals are global (saved by background job with no user context)
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        List<Opportunity> todayActive = opportunityRepository
                .findByIsSwingTrueAndStatusAndCreatedAtAfter("ACTIVE", startOfToday);
        return dtoService.mapToDtos(todayActive);
    }

    /**
     * Endpoint B: Paginated Swing Trade History.
     * GET /api/swing/history?page=0&size=10
     * Returns non-ACTIVE swing signals with server-side pagination.
     */
    @GetMapping("/swing/history")
    public Page<AiSignalDTO> getSwingHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Opportunity> historyPage = opportunityRepository
                .findByIsSwingTrueAndStatusNotOrderByCreatedAtDesc("ACTIVE", pageable);
        return dtoService.mapToPage(historyPage);
    }

    /**
     * Trigger a manual swing scan.
     * Runs synchronously so the client can reload results immediately on response.
     */
    @PostMapping("/swing/scan")
    public ResponseEntity<?> triggerSwingScan() {
        swingService.expirePreviousDaySignalsPublic();
        swingService.runPythonScan();
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        int count = opportunityRepository.findByIsSwingTrueAndStatusAndCreatedAtAfter("ACTIVE", startOfToday).size();
        return ResponseEntity.ok("Scan complete. Active signals today: " + count);
    }

    @GetMapping("/swing")
    public List<Opportunity> getSwingOpportunities() {
        String userId = userContextService.getCurrentUserId();
        return opportunityRepository.findByUserIdAndIsSwingTrueOrderByCreatedAtDesc(userId);
    }

    // ═══════════════════════════════════════════════
    // GENERAL OPPORTUNITY ENDPOINTS
    // ═══════════════════════════════════════════════

    @GetMapping
    public Page<AiSignalDTO> getOpportunities(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String symbol) {

        String userId = userContextService.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size);
        Page<Opportunity> opportunities;

        if (symbol != null && !symbol.isEmpty()) {
            opportunities = opportunityRepository.findByUserIdAndSymbolContainingIgnoreCaseOrderByCreatedAtDesc(userId,
                    symbol, pageable);
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
        opportunityRepository.save(opp);

        if (approved) {
            return ResponseEntity.ok("Trade Executed / Queued");
        } else {
            return ResponseEntity.badRequest().body("Trade Rejected by Risk Engine (Check Logs/Status)");
        }
    }

    @PostMapping("/scan")
    public ResponseEntity<?> triggerScan() {
        return ResponseEntity.ok("Scan Triggered (Check Logs)");
    }
}
