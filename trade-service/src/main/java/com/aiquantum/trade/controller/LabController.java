package com.aiquantum.trade.controller;

import com.aiquantum.trade.dto.TrainingRequestDTO;
import com.aiquantum.trade.service.LabService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/lab")
@RequiredArgsConstructor
public class LabController {

    private final LabService labService;
    private final com.aiquantum.trade.service.UserContextService userContextService;

    @PostMapping("/start-training")
    public ResponseEntity<Map<String, String>> startTraining(@RequestBody TrainingRequestDTO request) {
        String jobId = labService.startTraining(request);
        return ResponseEntity.ok(Map.of("jobId", jobId, "status", "STARTED"));
    }

    @PostMapping("/save-model")
    public ResponseEntity<com.aiquantum.trade.model.TrainedModel> saveModel(@RequestBody Map<String, Object> result) {
        String userId = userContextService.getCurrentUserId();
        return ResponseEntity.ok(labService.saveModel(result, userId));
    }

    @GetMapping("/active-strategies")
    public ResponseEntity<java.util.List<com.aiquantum.trade.dto.ActiveStrategyDTO>> getActiveStrategies() {
        String userId = userContextService.getCurrentUserId();
        return ResponseEntity.ok(labService.getActiveStrategies(userId));
    }

    @GetMapping("/models")
    public ResponseEntity<java.util.List<com.aiquantum.trade.model.TrainedModel>> getModels() {
        String userId = userContextService.getCurrentUserId();
        return ResponseEntity.ok(labService.getTrainedModels(userId));
    }
}
