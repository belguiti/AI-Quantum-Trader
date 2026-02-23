package com.aiquantum.trade.repository;

import com.aiquantum.trade.model.Trade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface TradeRepository extends JpaRepository<Trade, Long> {
       @org.springframework.data.jpa.repository.Query("SELECT DISTINCT t.status FROM Trade t")
       List<String> findDistinctStatuses();

       List<Trade> findByUserIdAndStatus(String userId, String status);

       org.springframework.data.domain.Page<Trade> findByUserIdOrderByEntryTimeDesc(String userId,
                     org.springframework.data.domain.Pageable pageable);

       org.springframework.data.domain.Page<Trade> findByUserIdAndSymbolContainingIgnoreCaseOrderByEntryTimeDesc(
                     String userId, String symbol, org.springframework.data.domain.Pageable pageable);

       long countByUserIdAndStatus(String userId, String status);

       List<Trade> findByOpportunityIdIn(List<Long> opportunityIds);

       List<Trade> findByUserId(String userId);

       // ---- Admin queries ----

       @Query("SELECT COUNT(t) FROM Trade t WHERE t.entryTime >= :since")
       long countTradesSince(LocalDateTime since);

       @Query("SELECT COALESCE(SUM(t.pnl), 0) FROM Trade t WHERE t.status = 'CLOSED'")
       double getPlatformNetPnl();

       @Query(value = """
                     SELECT TOP 10 symbol, COUNT(*) as cnt
                     FROM trades
                     GROUP BY symbol
                     ORDER BY cnt DESC
                     """, nativeQuery = true)
       List<Object[]> getMostTradedSymbols();

       @Query(value = """
                     SELECT TOP 10 user_id,
                            COUNT(*) as total,
                            SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as win_rate,
                            COALESCE(SUM(pnl), 0) as total_pnl
                     FROM trades
                     WHERE status = 'CLOSED'
                     GROUP BY user_id
                     HAVING COUNT(*) > 50
                        AND (SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) > 60
                     ORDER BY win_rate DESC
                     """, nativeQuery = true)
       List<Object[]> getTopTraders();

       List<Trade> findByUserIdInAndStatus(List<String> userIds, String status);

       @Query(value = """
                     SELECT user_id,
                            COUNT(*) as total,
                            SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) as win_rate,
                            COALESCE(SUM(pnl), 0) as total_pnl
                     FROM trades
                     WHERE status = 'CLOSED' AND user_id = :userId
                     GROUP BY user_id
                     """, nativeQuery = true)
       Object[] getUserTradeStats(String userId);
}
