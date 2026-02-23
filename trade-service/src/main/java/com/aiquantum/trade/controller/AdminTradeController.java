package com.aiquantum.trade.controller;

import com.aiquantum.trade.repository.TradeRepository;
import com.aiquantum.trade.model.Trade;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminTradeController {

    private final TradeRepository tradeRepository;

    @GetMapping("/trade-stats")
    public ResponseEntity<Map<String, Object>> getTradeStats() {
        long trades24h = tradeRepository.countTradesSince(LocalDateTime.now().minusHours(24));
        double netPnl = tradeRepository.getPlatformNetPnl();

        // Symbol breakdown for pie chart
        List<Object[]> rawSymbols = tradeRepository.getMostTradedSymbols();
        long totalTrades = rawSymbols.stream()
                .mapToLong(r -> ((Number) r[1]).longValue()).sum();
        List<Map<String, Object>> symbolBreakdown = new ArrayList<>();
        for (Object[] row : rawSymbols) {
            String symbol = (String) row[0];
            long count = ((Number) row[1]).longValue();
            double pct = totalTrades > 0 ? (count * 100.0 / totalTrades) : 0;
            Map<String, Object> entry = new HashMap<>();
            entry.put("symbol", symbol);
            entry.put("count", count);
            entry.put("percentage", Math.round(pct * 10.0) / 10.0);
            symbolBreakdown.add(entry);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("trades24h", trades24h);
        result.put("platformNetPnl", netPnl);
        result.put("symbolBreakdown", symbolBreakdown);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/crowd-signals")
    public ResponseEntity<List<Map<String, Object>>> getCrowdSignals() {
        // Get top traders (win rate > 60%, > 50 trades)
        List<Object[]> topTraders = tradeRepository.getTopTraders();
        if (topTraders.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<String> topTraderIds = topTraders.stream()
                .map(r -> r[0].toString())
                .collect(Collectors.toList());

        // Get their open positions
        List<Trade> openTrades = tradeRepository.findByUserIdInAndStatus(topTraderIds, "OPEN");

        // Group by symbol and side
        Map<String, Map<String, Long>> signalMap = new HashMap<>();
        for (Trade t : openTrades) {
            signalMap.computeIfAbsent(t.getSymbol(), k -> new HashMap<>())
                    .merge(t.getSide(), 1L, Long::sum);
        }

        // Build top 3 signals
        List<Map<String, Object>> signals = new ArrayList<>();
        for (Map.Entry<String, Map<String, Long>> entry : signalMap.entrySet()) {
            String symbol = entry.getKey();
            Map<String, Long> sides = entry.getValue();
            long buyCount = sides.getOrDefault("BUY", 0L);
            long sellCount = sides.getOrDefault("SELL", 0L);
            long total = buyCount + sellCount;
            if (total == 0)
                continue;

            String dominantSide = buyCount >= sellCount ? "BUY" : "SELL";
            long dominantCount = buyCount >= sellCount ? buyCount : sellCount;
            double sentiment = (dominantCount * 100.0) / total;

            Map<String, Object> signal = new HashMap<>();
            signal.put("symbol", symbol);
            signal.put("direction", dominantSide);
            signal.put("sentiment", Math.round(sentiment));
            signal.put("label", dominantSide.equals("BUY") ? "Strong Buy" : "Strong Sell");
            signal.put("traderCount", total);
            signals.add(signal);
        }

        // Sort by sentiment desc, take top 3
        signals.sort((a, b) -> ((Number) b.get("sentiment")).intValue() - ((Number) a.get("sentiment")).intValue());
        return ResponseEntity.ok(signals.stream().limit(3).collect(Collectors.toList()));
    }
}
