package com.aiquantum.trade.repository;

import com.aiquantum.trade.model.TrainedModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainedModelRepository extends JpaRepository<TrainedModel, Long> {
    List<TrainedModel> findBySymbol(String symbol);

    List<TrainedModel> findBySymbolAndIsDeployedTrueOrderByTrainingDateDesc(String symbol);

    List<TrainedModel> findByUserId(String userId);

    List<TrainedModel> findByUserIdAndIsDeployedTrue(String userId);
}
