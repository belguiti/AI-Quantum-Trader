package com.aiquantum.trade.repository;

import com.aiquantum.trade.model.MarketAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MarketAssetRepository extends JpaRepository<MarketAsset, Long> {
    List<MarketAsset> findByIsActiveTrue();

    boolean existsBySymbol(String symbol);
}
