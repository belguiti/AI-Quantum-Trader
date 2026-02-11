package com.aiquantum.trade.controller;

import com.aiquantum.trade.model.Trade;
import com.aiquantum.trade.service.TradeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/trades")
public class TradeController {

    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    @GetMapping
    public ResponseEntity<Page<Trade>> getAllTrades(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity
                .ok(tradeService.getAllTrades(PageRequest.of(page, size, Sort.by("timestamp").descending())));
    }

    @PostMapping
    public ResponseEntity<Trade> placeTrade(@RequestBody Trade trade) {
        return ResponseEntity.ok(tradeService.placeTrade(trade));
    }
}
