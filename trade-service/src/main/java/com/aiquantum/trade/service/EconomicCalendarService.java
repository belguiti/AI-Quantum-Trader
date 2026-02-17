package com.aiquantum.trade.service;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class EconomicCalendarService {

    @Value("${alphavantage.api.base-url}")
    private String baseUrl;

    @Value("${alphavantage.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    // In-memory cache
    private final Map<String, CachedData> cache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 60 * 60 * 1000; // 1 Hour

    @Data
    private static class CachedData {
        long timestamp;
        MacroIndicatorData data;

        public CachedData(MacroIndicatorData data) {
            this.data = data;
            this.timestamp = System.currentTimeMillis();
        }

        public boolean isValid() {
            return (System.currentTimeMillis() - timestamp) < CACHE_DURATION_MS;
        }
    }

    public MacroDashboardData getMacroDashboardData() {
        MacroDashboardData data = new MacroDashboardData();

        // 1. Fetch Indicators with Caching & Throttling
        // Rate limit 5/min. We have 3 critical calls.
        // If cache is empty, we must stagger calls.

        MacroIndicatorData interestRate = fetchData("FEDERAL_FUNDS_RATE");
        if (interestRate == null || interestRate.getData() == null)
            sleep(1500);

        MacroIndicatorData inflation = fetchData("CPI");
        if (inflation == null || inflation.getData() == null)
            sleep(1500);

        MacroIndicatorData unemployment = fetchData("UNEMPLOYMENT");

        data.setInterestRate(extractLatest(interestRate));
        data.setInflation(extractLatest(inflation));
        data.setUnemployment(extractLatest(unemployment));

        // 2. Build Calendar from these sources
        List<MacroEvent> events = new ArrayList<>();
        events.addAll(toEvents(interestRate, "Fed Interest Rate", "High"));
        events.addAll(toEvents(inflation, "CPI (YoY)", "High"));
        events.addAll(toEvents(unemployment, "Unemployment Rate", "High"));

        // Sort
        events.sort(Comparator.comparing(MacroEvent::getDate).reversed());

        data.setRecentEvents(events);

        // Mock Upcoming (unchanged)
        data.setUpcomingEvents(getMockUpcomingEvents());

        return data;
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private MacroIndicatorData.ValuePoint extractLatest(MacroIndicatorData data) {
        if (data != null && !data.getData().isEmpty()) {
            return data.getData().get(0);
        }
        return new MacroIndicatorData.ValuePoint("N/A", "0.0");
    }

    private List<MacroEvent> toEvents(MacroIndicatorData data, String name, String impact) {
        List<MacroEvent> list = new ArrayList<>();
        if (data == null || data.getData() == null)
            return list;

        List<MacroIndicatorData.ValuePoint> points = data.getData();
        // Take top 12 (1 year)
        int limit = Math.min(points.size(), 12);

        for (int i = 0; i < limit; i++) {
            MacroIndicatorData.ValuePoint p = points.get(i);
            MacroEvent e = new MacroEvent();
            e.setEvent(name);
            e.setDate(p.getDate());
            e.setActual(p.getValue());
            e.setCurrency("USD");
            e.setImpact(impact);
            e.setForecast("-"); // No forecast in AV time series

            // Previous
            if (i + 1 < points.size()) {
                e.setPrevious(points.get(i + 1).getValue());
            } else {
                e.setPrevious("-");
            }
            list.add(e);
        }
        return list;
    }

    private MacroIndicatorData fetchData(String function) {
        if (cache.containsKey(function)) {
            CachedData c = cache.get(function);
            if (c.isValid()) {
                return c.data;
            }
        }

        try {
            log.info("Fetching fresh macro data for {}", function);
            String url = String.format("%s?function=%s&apikey=%s", baseUrl, function, apiKey);
            MacroIndicatorData response = restTemplate.getForObject(url, MacroIndicatorData.class);

            if (response != null && response.getData() != null && !response.getData().isEmpty()) {
                cache.put(function, new CachedData(response));
                return response;
            } else {
                log.warn("Empty response for {}", function);
                // Return cached stale data if available
                if (cache.containsKey(function))
                    return cache.get(function).data;
                return null;
            }
        } catch (Exception e) {
            log.error("Failed to fetch macro data for {}", function, e);
            if (cache.containsKey(function))
                return cache.get(function).data;
            return null;
        }
    }

    private List<MacroEvent> getMockUpcomingEvents() {
        List<MacroEvent> events = new ArrayList<>();
        LocalDate now = LocalDate.now();
        // Mocking some future events so the calendar isn't empty on "Upcoming"
        events.add(new MacroEvent(now.plusDays(2).toString(), "USD", "Fed Interest Rate Decision", "-", "5.50", "5.50",
                "High"));
        events.add(new MacroEvent(now.plusDays(5).toString(), "USD", "Non-Farm Payrolls", "-", "180k", "216k", "High"));
        return events;
    }

    @Data
    public static class MacroDashboardData {
        private MacroIndicatorData.ValuePoint interestRate;
        private MacroIndicatorData.ValuePoint inflation;
        private MacroIndicatorData.ValuePoint unemployment;
        private List<MacroEvent> recentEvents;
        private List<MacroEvent> upcomingEvents;
    }

    @Data
    public static class MacroIndicatorData {
        private String name;
        private String interval;
        private String unit;
        private List<ValuePoint> data;

        @Data
        public static class ValuePoint {
            private String date;
            private String value;

            public ValuePoint() {
            }

            public ValuePoint(String date, String value) {
                this.date = date;
                this.value = value;
            }
        }
    }

    @Data
    public static class MacroEvent {
        private String date;
        private String currency;
        private String event;
        private String actual;
        private String forecast;
        private String previous;
        private String impact;

        public MacroEvent() {
        }

        public MacroEvent(String date, String currency, String event, String actual, String forecast, String previous,
                String impact) {
            this.date = date;
            this.currency = currency;
            this.event = event;
            this.actual = actual;
            this.forecast = forecast;
            this.previous = previous;
            this.impact = impact;
        }
    }
}
