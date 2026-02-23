package com.aiquantum.trade.strategy;

import com.aiquantum.trade.dto.BotConfigurationDTO;
import com.aiquantum.trade.model.Opportunity;
import org.springframework.stereotype.Component;
import org.ta4j.core.BarSeries;

import java.util.Optional;

@Component
public class NeuralLearnerStrategy implements TradingStrategy {

    @Override
    public String getName() {
        return "NEURAL_LEARNER";
    }

    @Override
    public Optional<Opportunity> analyze(String symbol, BarSeries series, BotConfigurationDTO config) {
        // The real AI logic is now fully handled by AiSignalService.java which bridges
        // to Python.
        // This old mock strategy in OpportunityScannerService is disabled so it doesn't
        // pollute the DB
        // with fake 82% BUY signals.
        return Optional.empty();
    }
}
