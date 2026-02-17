package com.aiquantum.trade.service;

import com.aiquantum.trade.model.Trade;
import com.aiquantum.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeService {

    private final TradeRepository tradeRepository;

    public Page<Trade> getAllTrades(String userId, Pageable pageable) { // Added userId
        return tradeRepository.findByUserIdOrderByEntryTimeDesc(userId, pageable);
    }

    public Page<Trade> getTradesBySymbol(String userId, String symbol, Pageable pageable) {
        return tradeRepository.findByUserIdAndSymbolContainingIgnoreCaseOrderByEntryTimeDesc(userId, symbol, pageable);
    }

    // Valid for Admin or internal use
    public Page<Trade> getAllTradesInternal(Pageable pageable) {
        return tradeRepository.findAll(pageable);
    }

    public Trade placeTrade(Trade trade) {
        // Used for manual simplistic placement or testing
        if (trade.getEntryTime() == null)
            trade.setEntryTime(LocalDateTime.now());
        if (trade.getStatus() == null)
            trade.setStatus("EXECUTED");

        return tradeRepository.save(trade);
    }

    public java.util.List<String> getDistinctStatuses() {
        return tradeRepository.findDistinctStatuses();
    }

    public java.util.List<Trade> getCheckTrades(String userId) {
        return tradeRepository.findByUserIdAndStatus(userId, "EXECUTED");
    }
}
