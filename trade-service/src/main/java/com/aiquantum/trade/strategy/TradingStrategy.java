package com.aiquantum.trade.strategy;

import com.aiquantum.trade.dto.BotConfigurationDTO;
import com.aiquantum.trade.model.Opportunity;
import org.ta4j.core.BarSeries;

import java.util.Optional;

public interface TradingStrategy {
    String getName();

    Optional<Opportunity> analyze(String symbol, BarSeries series, BotConfigurationDTO config);
}
