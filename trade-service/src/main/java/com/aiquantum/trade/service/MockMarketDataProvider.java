package com.aiquantum.trade.service;

import org.springframework.stereotype.Service;
import org.ta4j.core.BarSeries;
import org.ta4j.core.BaseBarSeriesBuilder;
import org.ta4j.core.num.DecimalNum;

import java.time.ZonedDateTime;
import java.util.Random;

@Service
public class MockMarketDataProvider {

    private final Random random = new Random();

    public BarSeries getMarketData(String symbol, String timeframe) {
        // Generate 100 candles of mock data
        // Start price random between 100 and 200 (or 20k-60k for BTC)
        double price = symbol.contains("BTC") ? 40000.0 : 1.1000;

        var series = new BaseBarSeriesBuilder().withName(symbol).build();
        ZonedDateTime now = ZonedDateTime.now().minusMinutes(100);

        for (int i = 0; i < 100; i++) {
            double open = price;
            double close = price + (random.nextDouble() - 0.5) * (symbol.contains("BTC") ? 100 : 0.0010);
            double high = Math.max(open, close) + random.nextDouble() * (symbol.contains("BTC") ? 50 : 0.0005);
            double low = Math.min(open, close) - random.nextDouble() * (symbol.contains("BTC") ? 50 : 0.0005);
            double volume = random.nextDouble() * 1000;

            series.addBar(now.plusMinutes(i), open, high, low, close, volume);
            price = close;
        }
        return series;
    }
}
