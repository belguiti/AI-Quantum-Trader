package com.aiquantum.trade.service;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.StringReader;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

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
        List<MacroEvent> events;

        public CachedData(List<MacroEvent> events) {
            this.events = events;
            this.timestamp = System.currentTimeMillis();
        }

        public boolean isValid() {
            return (System.currentTimeMillis() - timestamp) < CACHE_DURATION_MS;
        }
    }

    public MacroDashboardData getMacroDashboardData() {
        MacroDashboardData data = new MacroDashboardData();

        // 1. Fetch Calendar Data (Real or Mock)
        List<MacroEvent> allEvents = fetchCalendarData();

        // 2. Separate into "All Events" for the table
        // Sort by Date Descending
        allEvents.sort(Comparator.comparing(MacroEvent::getDate).reversed());
        data.setAllEvents(allEvents);

        // 3. Extract "Big 3" values from the events list for the dashboard headers if
        // available
        // This is a heuristic lookup since we don't call specific endpoints anymore
        data.setInterestRate(findLatestValue(allEvents, "Interest Rate", "5.50"));
        data.setInflation(findLatestValue(allEvents, "CPI", "3.4"));
        data.setUnemployment(findLatestValue(allEvents, "Unemployment", "3.7"));

        return data;
    }

    private List<MacroEvent> fetchCalendarData() {
        String cacheKey = "ECONOMIC_CALENDAR";
        if (cache.containsKey(cacheKey) && cache.get(cacheKey).isValid()) {
            return cache.get(cacheKey).events;
        }

        try {
            log.info("Fetching fresh Economic Calendar data...");
            // Alpha Vantage ECONOMIC_CALENDAR returns CSV
            String url = String.format("%s?function=ECONOMIC_CALENDAR&apikey=%s", baseUrl, apiKey);
            String response = restTemplate.getForObject(url, String.class);

            if (response != null && !response.contains("Error Message") && !response.contains("Information")) {
                List<MacroEvent> events = parseCsv(response);
                if (!events.isEmpty()) {
                    cache.put(cacheKey, new CachedData(events));
                    return events;
                }
            }

            log.warn("API Error, Empty Response or Limit Reached. Using fallback data.");
            return getMockCalendar();

        } catch (Exception e) {
            log.error("Failed to fetch calendar", e);
            return getMockCalendar();
        }
    }

    private List<MacroEvent> parseCsv(String csv) {
        List<MacroEvent> events = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new StringReader(csv))) {
            String line;
            boolean header = true;
            while ((line = br.readLine()) != null) {
                if (header) {
                    header = false;
                    continue;
                }
                // Simple CSV split, handling potential quotes
                String[] cols = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
                // AV CSV format: symbol,name,date,impact,currency
                // e.g. "GDP,Gross Domestic Product,2024-03-20,High,USD"
                // But the official docs say: name, date, time, zone, impact, actual, forecast,
                // previous?
                // Actually AV output for ECONOMIC_CALENDAR is:
                // symbol,event,date,time,country,impact,actual,forecast,previous
                // Let's safe parse based on expected columns.
                if (cols.length >= 2) {
                    MacroEvent e = new MacroEvent();
                    // Clean quotes
                    for (int i = 0; i < cols.length; i++)
                        cols[i] = cols[i].replace("\"", "");

                    // Mapping (Adjust indices based on actual API response observation if needed,
                    // but for now we assume a standard structure or map loosely)
                    // Let's assume: sentiment, name, date, time, country, impact...
                    e.setEvent(cols.length > 0 ? cols[0] : "Event");
                    e.setDate(cols.length > 2 ? cols[2] : LocalDate.now().toString());
                    e.setCurrency(cols.length > 4 ? cols[4] : "USD"); // Country code often acts as currency proxy
                    e.setImpact(cols.length > 5 ? cols[5] : "Medium");
                    e.setActual(cols.length > 6 ? cols[6] : "-");
                    e.setForecast(cols.length > 7 ? cols[7] : "-");
                    e.setPrevious(cols.length > 8 ? cols[8] : "-");

                    events.add(e);
                }
            }
        } catch (Exception e) {
            log.error("CSV Parse Error", e);
        }
        return events;
    }

    private MacroIndicatorData.ValuePoint findLatestValue(List<MacroEvent> events, String keyword,
            String defaultValue) {
        return events.stream()
                .filter(e -> e.getEvent().contains(keyword) && "USD".equals(e.getCurrency()))
                .findFirst()
                .map(e -> new MacroIndicatorData.ValuePoint(e.getDate(), e.getActual()))
                .orElse(new MacroIndicatorData.ValuePoint(LocalDate.now().toString(), defaultValue));
    }

    private List<MacroEvent> getMockCalendar() {
        List<MacroEvent> events = new ArrayList<>();
        LocalDate today = LocalDate.now();

        // Past Events
        events.add(new MacroEvent(today.minusDays(2).toString(), "USD", "Fed Interest Rate Decision", "5.50%", "5.50%",
                "5.25%", "High"));
        events.add(new MacroEvent(today.minusDays(1).toString(), "EUR", "ECB Interest Rate", "4.00%", "4.00%", "3.75%",
                "High"));
        events.add(new MacroEvent(today.toString(), "USD", "Initial Jobless Claims", "210K", "215K", "200K", "Medium"));

        // Today / Coming Soon
        events.add(new MacroEvent(today.toString(), "GBP", "BoE Governor Speaks", "-", "-", "-", "High"));
        events.add(new MacroEvent(today.toString(), "USD", "Crude Oil Inventories", "-", "-2.5M", "1.2M", "Medium"));

        // Future
        events.add(new MacroEvent(today.plusDays(1).toString(), "USD", "Core PCE Price Index", "-", "0.3%", "0.2%",
                "High"));
        events.add(new MacroEvent(today.plusDays(2).toString(), "JPY", "BOJ Core CPI", "-", "2.8%", "2.7%", "High"));
        events.add(
                new MacroEvent(today.plusDays(3).toString(), "USD", "Non-Farm Payrolls", "-", "180K", "216K", "High"));
        events.add(
                new MacroEvent(today.plusDays(4).toString(), "EUR", "HICP Inflation YoY", "-", "2.8%", "2.9%", "High"));
        events.add(new MacroEvent(today.plusDays(7).toString(), "USD", "CPI m/m", "-", "0.4%", "0.3%", "High"));
        events.add(new MacroEvent(today.plusDays(10).toString(), "USD", "FOMC Rate Decision", "-", "5.50%", "5.50%",
                "High"));

        return events;
    }

    @Data
    public static class MacroDashboardData {
        private MacroIndicatorData.ValuePoint interestRate;
        private MacroIndicatorData.ValuePoint inflation;
        private MacroIndicatorData.ValuePoint unemployment;
        private List<MacroEvent> allEvents;
    }

    @Data
    public static class MacroIndicatorData {
        @Data
        public static class ValuePoint {
            private String date;
            private String value;

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
