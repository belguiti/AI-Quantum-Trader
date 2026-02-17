package com.aiquantum.trade.repository;

import com.aiquantum.trade.model.BotConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BotConfigurationRepository extends JpaRepository<BotConfiguration, Long> {
    Optional<BotConfiguration> findByUserIdAndActiveTrue(String userId);

    java.util.List<BotConfiguration> findAllByUserIdOrderByCreatedAtDesc(String userId);
}
