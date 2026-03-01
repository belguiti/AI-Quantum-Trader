package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.MarketAssetOverviewDTO;
import com.aiquantum.trade.dto.WalletMetricsDTO;
import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.model.Trade;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import com.aiquantum.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final TradeRepository tradeRepository;
    private final BotConfigurationRepository botConfigRepository;
    private final Mt5ConnectorClient mt5ConnectorClient;
    private final UserContextService userContextService;

    private Optional<String> getUserMt5Url(String userId) {
        return botConfigRepository.findByUserIdAndActiveTrue(userId)
                .map(BotConfiguration::getMt5ConnectorBaseUrl);
    }

    public WalletMetricsDTO getWalletMetrics() {
        String userId = userContextService.getCurrentUserId();

        // 1. Active Bots
        Optional<BotConfiguration> activeBot = botConfigRepository.findByUserIdAndActiveTrue(userId);
        int activeBotsCount = activeBot.isPresent() ? 1 : 0;

        // 2. MT5 Live & Historical Data — only fetch if user has an active bot config (is connected)
        double totalBalance = 0.0;
        double floatingPnl = 0.0;
        double mt5TotalPnl = 0.0;
        double mt5WinRate = 0.0;
        double todayClosedPnl = 0.0;

        // If user has no active bot config they are disconnected — return zeroes
        if (activeBot.isEmpty()) {
            return WalletMetricsDTO.builder()
                    .totalBalance(0.0)
                    .totalPnl(0.0)
                    .dailyPnl(0.0)
                    .winRate(0.0)
                    .activeBots(0)
                    .build();
        }

        String mt5Url = activeBot.get().getMt5ConnectorBaseUrl();

        try {
            // Get Account Summary
            Mt5ConnectorClient.AccountSummary summary = mt5ConnectorClient.getAccountSummary(mt5Url);
            if (summary != null && summary.getBalance() != null) {
                totalBalance = summary.getBalance();
            }

            // Get Live Open Positions (Floating PnL)
            List<Mt5ConnectorClient.Mt5Position> openPositions = mt5ConnectorClient.getOpenPositions(mt5Url);
            if (openPositions != null) {
                floatingPnl = openPositions.stream()
                        .mapToDouble(p -> p.getProfit() != null ? p.getProfit() : 0.0)
                        .sum();
            }

            // Get last 30 days history for real Win Rate, Total PnL, and Daily Closed PnL
            List<Mt5ConnectorClient.Mt5Deal> history = mt5ConnectorClient.getHistory(mt5Url, 30);
            if (history != null && !history.isEmpty()) {
                int totalOutDeals = 0;
                int winningOutDeals = 0;
                long startOfDaySeconds = LocalDate.now().atStartOfDay().atZone(ZoneId.systemDefault()).toEpochSecond();

                for (Mt5ConnectorClient.Mt5Deal deal : history) {
                    if ("1".equals(deal.getEntry()) || "OUT".equalsIgnoreCase(deal.getEntry())
                            || "2".equals(deal.getEntry()) || "INOUT".equalsIgnoreCase(deal.getEntry())) {

                        double pnl = (deal.getProfit() != null ? deal.getProfit() : 0.0)
                                + (deal.getCommission() != null ? deal.getCommission() : 0.0)
                                + (deal.getSwap() != null ? deal.getSwap() : 0.0);

                        mt5TotalPnl += pnl;
                        totalOutDeals++;
                        if (pnl > 0) {
                            winningOutDeals++;
                        }

                        if (deal.getTime() != null && deal.getTime() >= startOfDaySeconds) {
                            todayClosedPnl += pnl;
                        }
                    }
                }
                if (totalOutDeals > 0) {
                    mt5WinRate = (winningOutDeals * 100.0) / totalOutDeals;
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch MT5 metrics for wallet dashboard", e);
        }

        double dailyPnl = todayClosedPnl + floatingPnl;

        return WalletMetricsDTO.builder()
                .totalBalance(totalBalance)
                .totalPnl(mt5TotalPnl)
                .dailyPnl(dailyPnl)
                .winRate(mt5WinRate)
                .activeBots(activeBotsCount)
                .build();
    }

    public List<MarketAssetOverviewDTO> getMarketOverview() {
        String userId = userContextService.getCurrentUserId();
        // Market overview uses the user's connector if connected, otherwise the default
        String mt5Url = getUserMt5Url(userId).orElse("http://127.0.0.1:5005");

        List<String> topAssets = List.of("BTCUSD", "ETHUSD", "EURUSD", "GBPUSD", "XAUUSD");
        List<MarketAssetOverviewDTO> overviewData = new ArrayList<>();

        for (String symbol : topAssets) {
            try {
                // Get last 24 H1 candles
                List<Mt5ConnectorClient.Candle> candles = mt5ConnectorClient.getCandles(mt5Url, symbol, "H1", 24);

                double currentPrice = 0.0;
                double dailyChangePercent = 0.0;
                List<Double> sparkline = new ArrayList<>();

                if (candles != null && !candles.isEmpty()) {
                    currentPrice = candles.get(candles.size() - 1).getClose();
                    double open24hAgo = candles.get(0).getOpen();

                    if (open24hAgo > 0) {
                        dailyChangePercent = ((currentPrice - open24hAgo) / open24hAgo) * 100.0;
                    }

                    for (Mt5ConnectorClient.Candle c : candles) {
                        sparkline.add(c.getClose());
                    }
                }

                overviewData.add(MarketAssetOverviewDTO.builder()
                        .symbol(symbol)
                        .currentPrice(currentPrice)
                        .dailyChangePercent(dailyChangePercent)
                        .sparklineData(sparkline)
                        .build());
            } catch (Exception e) {
                log.error("Failed to fetch market overview for {}", symbol, e);
            }
        }

        return overviewData;
    }

    public List<Mt5ConnectorClient.Mt5Position> getLivePositions() {
        String userId = userContextService.getCurrentUserId();
        Optional<String> mt5UrlOpt = getUserMt5Url(userId);

        // Not connected — return empty list
        if (mt5UrlOpt.isEmpty()) return List.of();

        List<Mt5ConnectorClient.Mt5Position> allPositions = mt5ConnectorClient.getOpenPositions(mt5UrlOpt.get());
        if (allPositions == null) return List.of();

        // Filter to only positions that belong to this user (matched by ticket IDs in DB)
        Set<String> userTicketIds = tradeRepository.findByUserId(userId).stream()
                .map(Trade::getExternalOrderId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        return allPositions.stream()
                .filter(pos -> userTicketIds.contains(String.valueOf(pos.getTicket())))
                .collect(Collectors.toList());
    }

    public Mt5ConnectorClient.OrderResponse closeTrade(Long ticket) {
        String userId = userContextService.getCurrentUserId();
        String mt5Url = getUserMt5Url(userId).orElse("http://127.0.0.1:5005");
        return mt5ConnectorClient.closePosition(mt5Url, ticket);
    }
}
