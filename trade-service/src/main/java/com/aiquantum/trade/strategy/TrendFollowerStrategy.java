package com.aiquantum.trade.strategy;

import com.aiquantum.trade.dto.BotConfigurationDTO;
import com.aiquantum.trade.model.Opportunity;
import org.springframework.stereotype.Component;
import org.ta4j.core.BarSeries;
import org.ta4j.core.indicators.EMAIndicator;
import org.ta4j.core.indicators.helpers.ClosePriceIndicator;

import java.util.Optional;

@Component
public class TrendFollowerStrategy implements TradingStrategy {

    @Override
    public String getName() {
        return "TREND_FOLLOWER";
    }

    @Override
    public Optional<Opportunity> analyze(String symbol, BarSeries series, BotConfigurationDTO config) {
        ClosePriceIndicator closePrice = new ClosePriceIndicator(series);
        EMAIndicator ema50 = new EMAIndicator(closePrice, 50);
        EMAIndicator ema200 = new EMAIndicator(closePrice, 200);

        int endIndex = series.getEndIndex();
        if (endIndex < 200)
            return Optional.empty(); // Not enough data

        double currentEma50 = ema50.getValue(endIndex).doubleValue();
        double currentEma200 = ema200.getValue(endIndex).doubleValue();

        double prevEma50 = ema50.getValue(endIndex - 1).doubleValue();
        double prevEma200 = ema200.getValue(endIndex - 1).doubleValue();

        Opportunity opp = new Opportunity();
        opp.setSymbol(symbol);
        opp.setEntryPrice(series.getLastBar().getClosePrice().doubleValue());

        // Crossover Logic
        if (prevEma50 <= prevEma200 && currentEma50 > currentEma200) {
            // Golden Cross
            opp.setSide("BUY");
            opp.setPredictedWinProbability(0.65);
            opp.setConfidence(0.9);
            opp.setStrategyBreakdown("Golden Cross (EMA50 > EMA200)");
            return Optional.of(opp);
        } else if (prevEma50 >= prevEma200 && currentEma50 < currentEma200) {
            // Death Cross
            opp.setSide("SELL");
            opp.setPredictedWinProbability(0.65);
            opp.setConfidence(0.9);
            opp.setStrategyBreakdown("Death Cross (EMA50 < EMA200)");
            return Optional.of(opp);
        }

        return Optional.empty();
    }
}
