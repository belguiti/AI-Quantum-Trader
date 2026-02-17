package com.aiquantum.trade.repository;

import com.aiquantum.trade.model.RiskState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RiskStateRepository extends JpaRepository<RiskState, Long> {
    Optional<RiskState> findByUserId(String userId);
}
