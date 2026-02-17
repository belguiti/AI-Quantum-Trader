package com.aiquantum.trade.repository;

import com.aiquantum.trade.model.Trade;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TradeRepository extends JpaRepository<Trade, Long> {
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT t.status FROM Trade t")
    List<String> findDistinctStatuses();

    List<Trade> findByUserIdAndStatus(String userId, String status);

    // List<Trade> findAllByUserIdOrderByEntryTimeDesc(String userId, Pageable
    // pageable); // Default findAll(Pageable) doesn't filter by user

    org.springframework.data.domain.Page<Trade> findByUserIdOrderByEntryTimeDesc(String userId,
            org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Trade> findByUserIdAndSymbolContainingIgnoreCaseOrderByEntryTimeDesc(
            String userId, String symbol, org.springframework.data.domain.Pageable pageable);

    long countByUserIdAndStatus(String userId, String status);

    List<Trade> findByOpportunityIdIn(List<Long> opportunityIds);
}
