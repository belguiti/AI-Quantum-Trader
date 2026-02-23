package com.aiquantum.trade.repository;

import com.aiquantum.trade.model.Opportunity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {
        List<Opportunity> findByUserIdAndStatusOrderByPredictedWinProbabilityDesc(String userId, String status);

        org.springframework.data.domain.Page<Opportunity> findAllByUserIdOrderByCreatedAtDesc(String userId,
                        org.springframework.data.domain.Pageable pageable);

        org.springframework.data.domain.Page<Opportunity> findByUserIdAndSymbolContainingIgnoreCaseOrderByCreatedAtDesc(
                        String userId, String symbol, org.springframework.data.domain.Pageable pageable);

        // Keep existing for backward compat if needed (or remove if unused)
        List<Opportunity> findTop20ByUserIdOrderByPredictedWinProbabilityDesc(String userId);

        long countBySource(String source);

        Opportunity findTopBySourceOrderByCreatedAtDesc(String source);

        List<Opportunity> findByIsSwingTrueOrderByCreatedAtDesc();

        List<Opportunity> findTop2BySymbolOrderByCreatedAtDesc(String symbol);
}
