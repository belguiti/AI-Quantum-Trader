package com.aiquantum.trade.strategy;

import com.aiquantum.trade.dto.BotConfigurationDTO;
import com.aiquantum.trade.model.Opportunity;
import org.springframework.stereotype.Component;
import org.ta4j.core.BarSeries;
import org.ta4j.core.indicators.RSIIndicator;
import org.ta4j.core.indicators.helpers.ClosePriceIndicator;

import java.util.Optional;

@Component
public class RsiScalperStrategy implements TradingStrategy {

    @Override
    public String getName() {
        return "RSI_SCALPER";
    }

    @Override
    public Optional<Opportunity> analyze(String symbol, BarSeries series, BotConfigurationDTO config) {
        ClosePriceIndicator closePrice = new ClosePriceIndicator(series);
        int lookback = config.getAiParameters() != null && config.getAiParameters().getLookbackPeriod() != null
                ? config.getAiParameters().getLookbackPeriod()
                : 14;

        RSIIndicator rsi = new RSIIndicator(closePrice, lookback);
        double currentRsi = rsi.getValue(series.getEndIndex()).doubleValue();
        double currentPrice = series.getLastBar().getClosePrice().doubleValue();

        Opportunity opp = new Opportunity();
        opp.setSymbol(symbol);
        opp.setEntryPrice(currentPrice);
        opp.setStrategyBreakdown("RSI Scalper: Value = " + String.format("%.2f", currentRsi));

        if (currentRsi < 30) {
            opp.setSide("BUY");
            opp.setPredictedWinProbability(0.70); // Base high for oversold
            opp.setConfidence(0.85);
            return Optional.of(opp);
        } else if (currentRsi > 70) {
            opp.setSide("SELL");
            opp.setPredictedWinProbability(0.70);
            opp.setConfidence(0.85);
            return Optional.of(opp);
        }

        return Optional.empty();
    }
}
