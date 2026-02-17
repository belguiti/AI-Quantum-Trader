package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.TrainingRequestDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class LabService {

    private final SimpMessagingTemplate messagingTemplate;
    private final RestTemplate restTemplate = new RestTemplate();
    private final String PYTHON_SERVICE_URL = "http://localhost:8002/lab/train";

    private final com.aiquantum.trade.repository.TrainedModelRepository trainedModelRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final com.aiquantum.trade.repository.OpportunityRepository opportunityRepository;

    public String startTraining(TrainingRequestDTO request) {
        String jobId = UUID.randomUUID().toString();
        log.info("Starting training job: {}", jobId);

        // Run async to not block the controller
        CompletableFuture.runAsync(() -> {
            try {
                // Notify start
                messagingTemplate.convertAndSend("/topic/lab/progress", Map.of(
                        "jobId", jobId,
                        "progress", 10,
                        "message", "Connecting to Neuro-Quantum Engine..."));

                // Call Python Service (Blocking call for now)
                log.info("Sending request to Python Engine...");
                Map<String, Object> result = restTemplate.postForObject(PYTHON_SERVICE_URL, request, Map.class);
                log.info("Received response from Python Engine: {}", result);

                // Notify completion
                java.util.Map<String, Object> msg = new java.util.HashMap<>();
                msg.put("jobId", jobId);
                msg.put("progress", 100);
                msg.put("message", "Optimization Complete!");
                msg.put("result", result);

                messagingTemplate.convertAndSend("/topic/lab/progress", msg);

            } catch (Exception e) {
                log.error("Training failed", e);
                java.util.Map<String, Object> err = new java.util.HashMap<>();
                err.put("jobId", jobId);
                err.put("progress", -1);
                err.put("message", "Error: " + e.getMessage());
                messagingTemplate.convertAndSend("/topic/lab/progress", err);
            }
        });

        return jobId;
    }

    public com.aiquantum.trade.model.TrainedModel saveModel(Map<String, Object> result) {
        try {
            com.aiquantum.trade.model.TrainedModel model;

            // CHECK IF UPDATING EXISTING MODEL
            if (result.containsKey("id") && result.get("id") != null) {
                Long id = ((Number) result.get("id")).longValue();
                model = trainedModelRepository.findById(id).orElse(new com.aiquantum.trade.model.TrainedModel());
                // Keep existing name if not provided in update ??
                // actually if result has new metrics, we update them.
            } else {
                model = new com.aiquantum.trade.model.TrainedModel();
            }

            // Extract symbol using safe casting or check
            if (result.containsKey("symbol")) {
                model.setSymbol((String) result.get("symbol"));
            } else if (model.getSymbol() == null) {
                model.setSymbol("UNKNOWN");
            }

            if (result.containsKey("name")) {
                model.setName((String) result.get("name"));
            } else if (model.getName() == null) {
                model.setName(model.getSymbol() + " Strategy");
            }

            model.setTrainingDate(java.time.LocalDateTime.now()); // Update timestamp on re-save

            if (result.containsKey("bestParams")) {
                model.setParameters(objectMapper.writeValueAsString(result.get("bestParams")));
            }

            // Metrics extraction (e.g., winRate, totalReturn)
            model.setMetrics(objectMapper.writeValueAsString(result)); // Save full result as metrics/metadata for now

            model.setDeployed(true);

            return trainedModelRepository.save(model);
        } catch (Exception e) {
            log.error("Failed to save trained model", e);
            throw new RuntimeException("Failed to save model: " + e.getMessage());
        }
    }

    public java.util.List<com.aiquantum.trade.model.TrainedModel> getTrainedModels() {
        return trainedModelRepository.findAll();
    }

    public java.util.List<com.aiquantum.trade.dto.ActiveStrategyDTO> getActiveStrategies() {
        java.util.List<com.aiquantum.trade.model.TrainedModel> models = trainedModelRepository.findAll();
        // efficient filtering? findAll is fine for MVP.
        return models.stream()
                .filter(com.aiquantum.trade.model.TrainedModel::isDeployed)
                .map(m -> {
                    com.aiquantum.trade.dto.ActiveStrategyDTO dto = new com.aiquantum.trade.dto.ActiveStrategyDTO();
                    dto.setModelId(m.getId());
                    dto.setSymbol(m.getSymbol());
                    dto.setName(m.getName() != null ? m.getName() : "AI-Model-" + m.getId());
                    dto.setStatus("ACTIVE");
                    dto.setDeployedAt(m.getTrainingDate()); // logic: deployed roughly when trained if newly trained

                    // Count signals (Opportunities) for this model source
                    String sourceId = "AI_LAB_MODEL_" + m.getId();
                    long signals = opportunityRepository.countBySource(sourceId);
                    dto.setTotalSignals((int) signals);

                    // Fetch latest signal for reasoning
                    com.aiquantum.trade.model.Opportunity latest = opportunityRepository
                            .findTopBySourceOrderByCreatedAtDesc(sourceId);
                    if (latest != null) {
                        dto.setLastSignalReasoning(latest.getStrategyBreakdown());
                        dto.setLastSignalSentiment(latest.getSentimentScore());
                    }

                    // Parse metrics JSON to get winRate
                    try {
                        if (m.getMetrics() != null) {
                            Map metrics = objectMapper.readValue(m.getMetrics(), Map.class);
                            if (metrics.containsKey("winRate"))
                                dto.setWinRate(((Number) metrics.get("winRate")).doubleValue());
                            if (metrics.containsKey("totalReturn"))
                                dto.setExpectedReturn(((Number) metrics.get("totalReturn")).doubleValue());
                        }
                    } catch (Exception e) {
                        log.warn("Failed to parse metrics for model {}", m.getId());
                    }

                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());
    }
}
