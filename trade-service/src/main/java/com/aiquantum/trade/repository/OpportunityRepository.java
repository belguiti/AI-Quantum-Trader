package com.aiquantum.trade.repository;

import com.aiquantum.trade.model.Opportunity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {

        // ── Existing Methods ──
        List<Opportunity> findByUserIdAndStatusOrderByPredictedWinProbabilityDesc(String userId, String status);

        Page<Opportunity> findAllByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

        Page<Opportunity> findByUserIdAndSymbolContainingIgnoreCaseOrderByCreatedAtDesc(
                        String userId, String symbol, Pageable pageable);

        List<Opportunity> findTop20ByUserIdOrderByPredictedWinProbabilityDesc(String userId);

        long countBySource(String source);

        Opportunity findTopBySourceOrderByCreatedAtDesc(String source);

        List<Opportunity> findByIsSwingTrueOrderByCreatedAtDesc();

        List<Opportunity> findTop2BySymbolOrderByCreatedAtDesc(String symbol);

        // ── Swing Trading: Today's Active Setups ──
        List<Opportunity> findByIsSwingTrueAndStatusAndCreatedAtAfter(String status, LocalDateTime since);
        List<Opportunity> findByUserIdAndIsSwingTrueAndStatusAndCreatedAtAfter(String userId, String status, LocalDateTime since);

        // ── Swing Trading: Expire old signals ──
        List<Opportunity> findByIsSwingTrueAndStatusAndCreatedAtBefore(String status, LocalDateTime before);

        // ── Swing Trading: Paginated History (non-ACTIVE) ──
        Page<Opportunity> findByIsSwingTrueAndStatusNotOrderByCreatedAtDesc(String status, Pageable pageable);
        Page<Opportunity> findByUserIdAndIsSwingTrueAndStatusNotOrderByCreatedAtDesc(String userId, String status, Pageable pageable);

        // ── Swing Trading: All swing (user-scoped) ──
        List<Opportunity> findByUserIdAndIsSwingTrueOrderByCreatedAtDesc(String userId);
}
