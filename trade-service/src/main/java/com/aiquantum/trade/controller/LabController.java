package com.aiquantum.trade.controller;

import com.aiquantum.trade.dto.TrainingRequestDTO;
import com.aiquantum.trade.service.LabService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/lab")
@RequiredArgsConstructor
public class LabController {

    private final LabService labService;

    @PostMapping("/start-training")
    public ResponseEntity<Map<String, String>> startTraining(@RequestBody TrainingRequestDTO request) {
        String jobId = labService.startTraining(request);
        return ResponseEntity.ok(Map.of("jobId", jobId, "status", "STARTED"));
    }

    @PostMapping("/save-model")
    public ResponseEntity<com.aiquantum.trade.model.TrainedModel> saveModel(@RequestBody Map<String, Object> result) {
        return ResponseEntity.ok(labService.saveModel(result));
    }

    @GetMapping("/active-strategies")
    public ResponseEntity<java.util.List<com.aiquantum.trade.dto.ActiveStrategyDTO>> getActiveStrategies() {
        return ResponseEntity.ok(labService.getActiveStrategies());
    }

    @GetMapping("/models")
    public ResponseEntity<java.util.List<com.aiquantum.trade.model.TrainedModel>> getModels() {
        return ResponseEntity.ok(labService.getTrainedModels());
    }
}
