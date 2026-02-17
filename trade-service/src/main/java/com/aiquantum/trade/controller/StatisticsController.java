package com.aiquantum.trade.controller;

import com.aiquantum.trade.dto.AiPredictionDTO;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.model.Trade;
import com.aiquantum.trade.repository.OpportunityRepository;
import com.aiquantum.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatisticsController {

    private final TradeRepository tradeRepository;
    private final OpportunityRepository opportunityRepository;

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        List<Trade> trades = tradeRepository.findAll();

        long totalTrades = trades.size();
        long wins = trades.stream().filter(t -> t.getPnl() != null && t.getPnl() > 0).count();
        double winRate = totalTrades > 0 ? (double) wins / totalTrades : 0.0;

        return Map.of(
                "totalTrades", totalTrades,
                "winRate", winRate,
                "profitFactor", 1.5, // Mock until we calculate real PnL ratio
                "maxDrawdown", -5.0 // Mock
        );
    }

    @GetMapping("/ai-insights")
    public AiPredictionDTO getAiInsights(@RequestParam(required = false) String symbol) {
        // Fetch opportunities
        List<Opportunity> topOpps = opportunityRepository.findAll();

        // Filter by symbol if provided
        if (symbol != null && !symbol.isEmpty()) {
            topOpps = topOpps.stream()
                    .filter(o -> symbol.equalsIgnoreCase(o.getSymbol()))
                    .toList();
        }

        if (topOpps.isEmpty()) {
            return AiPredictionDTO.builder()
                    .technical_confidence(0.0)
                    .sentiment_score(0.0)
                    .aggregate_score(0.0)
                    .action("HOLD")
                    .symbol(symbol != null ? symbol : "GLOBAL")
                    .build();
        }

        // Calculate sentiment based on opportunities
        long buyCount = topOpps.stream().filter(o -> "BUY".equalsIgnoreCase(o.getSide())).count();
        long sellCount = topOpps.stream().filter(o -> "SELL".equalsIgnoreCase(o.getSide())).count();
        double avgConfidence = topOpps.stream()
                .mapToDouble(o -> o.getPredictedWinProbability() != null ? o.getPredictedWinProbability() : 0.5)
                .average().orElse(0.5);

        double total = buyCount + sellCount;
        double sentimentScore = 0.0; // -1 to 1

        if (total > 0) {
            sentimentScore = (double) (buyCount - sellCount) / total;
        }

        String action = "HOLD";
        if (sentimentScore > 0.2)
            action = "BUY";
        else if (sentimentScore < -0.2)
            action = "SELL";

        // If symbol specific, use it. Else find key symbol.
        String topSymbol = symbol;
        if (topSymbol == null) {
            topSymbol = topOpps.stream()
                    .sorted((o1, o2) -> Double.compare(
                            o2.getPredictedWinProbability() != null ? o2.getPredictedWinProbability() : 0,
                            o1.getPredictedWinProbability() != null ? o1.getPredictedWinProbability() : 0))
                    .map(Opportunity::getSymbol)
                    .findFirst()
                    .orElse("GLOBAL");
        }

        // Find latest reasoning for the top symbol (Exclude Manual Trades)
        String reasoning = "Initializing Quantum Analysis...";
        String finalTopSymbol = topSymbol;

        Opportunity latestOpp = topOpps.stream()
                .filter(o -> finalTopSymbol.equals(o.getSymbol()))
                .filter(o -> o.getStrategyBreakdown() != null
                        && !o.getStrategyBreakdown().contains("MANUAL_USER_OVERRIDE"))
                .max((o1, o2) -> o1.getCreatedAt().compareTo(o2.getCreatedAt()))
                .orElse(null);

        if (latestOpp != null) {
            reasoning = latestOpp.getStrategyBreakdown();
        }

        return AiPredictionDTO.builder()
                .technical_confidence(avgConfidence)
                .sentiment_score(sentimentScore)
                .aggregate_score((avgConfidence + (Math.abs(sentimentScore) + 1) / 2) / 2) // Rough blend
                .action(action)
                .symbol(topSymbol)
                .reasoning(reasoning)
                .build();
    }
}
