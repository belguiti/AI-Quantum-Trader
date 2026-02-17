package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.AiFeaturesDTO;
import com.aiquantum.trade.dto.AiPredictionDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NeuralPredictionService {

    private final RestTemplate restTemplate;
    // TODO: Move to config
    private final String AI_ENGINE_URL = "http://localhost:8000/predict";

    public AiPredictionDTO predict(List<Double> features, String newsHeadline) {
        try {
            AiFeaturesDTO request = AiFeaturesDTO.builder()
                    .features(features)
                    .newsHeadline(newsHeadline)
                    .build();

            log.info("Sending prediction request to AI Engine: {}", request);
            return restTemplate.postForObject(AI_ENGINE_URL, request, AiPredictionDTO.class);
        } catch (Exception e) {
            log.error("Failed to get prediction from AI Engine", e);
            return null;
        }
    }
}
