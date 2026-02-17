package com.aiquantum.trade.controller;

import com.aiquantum.trade.dto.AiPredictionDTO;
import com.aiquantum.trade.model.MarketData;
import com.aiquantum.trade.service.NeuralPredictionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.ta4j.core.BarSeries;
import org.ta4j.core.BaseBarSeriesBuilder;
import org.ta4j.core.indicators.MACDIndicator;
import org.ta4j.core.indicators.RSIIndicator;
import org.ta4j.core.indicators.helpers.ClosePriceIndicator;
import org.ta4j.core.indicators.helpers.VolumeIndicator;
import org.ta4j.core.indicators.statistics.StandardDeviationIndicator;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiInsightsController {

    private final NeuralPredictionService predictionService;
    private final Random random = new Random();

    @GetMapping("/insights")
    public AiPredictionDTO getInsights() {
        // 1. In a real app, fetch latest 100 bars from MarketDataService/DB
        // For now, simulate realistic market data to generate a valid prediction
        List<MarketData> data = generateSimulatedMarketData();

        // 2. Convert to BarSeries (Same logic as Strategy - should refactor to utility)
        BarSeries series = convertToBarSeries(data);
        int endIndex = series.getEndIndex();

        // 3. Calculate Indicators
        ClosePriceIndicator closePrice = new ClosePriceIndicator(series);
        RSIIndicator rsi = new RSIIndicator(closePrice, 14);
        MACDIndicator macd = new MACDIndicator(closePrice, 12, 26);
        VolumeIndicator volume = new VolumeIndicator(series);
        StandardDeviationIndicator stdDev = new StandardDeviationIndicator(closePrice, 20);

        double rsiValue = rsi.getValue(endIndex).doubleValue();
        double macdValue = macd.getValue(endIndex).doubleValue();
        double currentVol = volume.getValue(endIndex).doubleValue();
        double avgVol = volume.getValue(endIndex - 1).doubleValue();
        double normVolume = (avgVol > 0) ? Math.min(Math.max(currentVol / avgVol, 0.0), 5.0) / 5.0 : 0.5;
        double currentClose = closePrice.getValue(endIndex).doubleValue();
        double prevClose = closePrice.getValue(endIndex - 1).doubleValue();
        double priceChange = (currentClose - prevClose) / prevClose;
        double volatility = stdDev.getValue(endIndex).doubleValue() / currentClose;

        List<Double> features = List.of(rsiValue, macdValue, normVolume, priceChange, volatility);

        // 4. Call AI
        return predictionService.predict(features, "Bitcoin market shows strong momentum");
    }

    private List<MarketData> generateSimulatedMarketData() {
        List<MarketData> data = new ArrayList<>();
        double price = 50000.0;
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("UTC"));

        for (int i = 0; i < 100; i++) {
            MarketData md = new MarketData();
            md.setTimestamp(now.minusMinutes(100 - i).toLocalDateTime());

            double change = (random.nextDouble() - 0.5) * 200; // Random walk
            price += change;

            md.setOpen(price);
            md.setHigh(price + random.nextDouble() * 50);
            md.setLow(price - random.nextDouble() * 50);
            md.setClose(price + (random.nextDouble() - 0.5) * 20);
            md.setVolume(random.nextDouble() * 1000);

            data.add(md);
        }
        return data;
    }

    private BarSeries convertToBarSeries(List<MarketData> data) {
        BarSeries series = new BaseBarSeriesBuilder().withName("market_data").build();
        for (MarketData md : data) {
            ZonedDateTime time = md.getTimestamp().atZone(ZoneId.systemDefault());
            double open = md.getOpen() != null ? md.getOpen() : 0.0;
            double high = md.getHigh() != null ? md.getHigh() : 0.0;
            double low = md.getLow() != null ? md.getLow() : 0.0;
            double close = md.getClose() != null ? md.getClose() : 0.0;
            double volume = md.getVolume() != null ? md.getVolume() : 0.0;
            series.addBar(time, open, high, low, close, volume);
        }
        return series;
    }
}
