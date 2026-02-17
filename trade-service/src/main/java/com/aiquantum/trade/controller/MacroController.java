package com.aiquantum.trade.controller;

import com.aiquantum.trade.service.EconomicCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/macro")
@RequiredArgsConstructor
public class MacroController {

    private final EconomicCalendarService economicCalendarService;

    @GetMapping("/dashboard")
    public ResponseEntity<EconomicCalendarService.MacroDashboardData> getDashboardData() {
        return ResponseEntity.ok(economicCalendarService.getMacroDashboardData());
    }
}
