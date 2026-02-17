package com.aiquantum.trade.controller;

import com.aiquantum.trade.dto.BotConfigurationDTO;
import com.aiquantum.trade.model.BotConfiguration;
import com.aiquantum.trade.repository.BotConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bot")
@RequiredArgsConstructor
public class BotConfigurationController {

    private final BotConfigurationRepository repository;
    private final com.aiquantum.trade.service.UserContextService userContextService;

    @PostMapping("/configure")
    public ResponseEntity<BotConfiguration> configureBot(@RequestBody BotConfigurationDTO dto) {
        String userId = userContextService.getCurrentUserId();

        // Deactivate old configs
        repository.findByUserIdAndActiveTrue(userId).ifPresent(c -> {
            c.setActive(false);
            repository.save(c);
        });

        BotConfiguration config = new BotConfiguration();
        BeanUtils.copyProperties(dto, config);
        // Explicitly set config name if present (BeanUtils should handle it, but being
        // safe)
        if (dto.getConfigName() != null) {
            config.setConfigName(dto.getConfigName());
        }

        // Manual map for nested
        if (dto.getAiParameters() != null) {
            config.setAiLookbackPeriod(dto.getAiParameters().getLookbackPeriod());
            config.setAiConfidenceThreshold(dto.getAiParameters().getConfidenceThreshold());
        }
        if (dto.getRiskParameters() != null) {
            config.setStopLossPercentage(dto.getRiskParameters().getStopLossPercentage());
            config.setTakeProfitPercentage(dto.getRiskParameters().getTakeProfitPercentage());
            config.setRiskRewardRatio(dto.getRiskParameters().getRiskRewardRatio());
            config.setMaxOpenTrades(dto.getRiskParameters().getMaxOpenTrades());
            config.setRiskPerTradePct(dto.getRiskParameters().getRiskPerTradePct());
            config.setMaxDailyLossPct(dto.getRiskParameters().getMaxDailyLossPct());
            config.setCooldownMinutesAfterLoss(dto.getRiskParameters().getCooldownMinutesAfterLoss());
        }
        if (dto.getExecutionParameters() != null) {
            config.setSymbols(dto.getExecutionParameters().getSymbols());
            config.setTimeframe(dto.getExecutionParameters().getTimeframe());
            config.setAllowShort(dto.getExecutionParameters().isAllowShort());
        }
        if (dto.getConnectivity() != null) {
            config.setAccountType(dto.getConnectivity().getAccountType());
            config.setMt5Login(dto.getConnectivity().getMt5Login());
            config.setMt5Password(dto.getConnectivity().getMt5Password());
            config.setMt5Password(dto.getConnectivity().getMt5Password());
            config.setMt5Server(dto.getConnectivity().getMt5Server());
            config.setMt5Path(dto.getConnectivity().getMt5Path());
            config.setMt5ConnectorBaseUrl(dto.getConnectivity().getMt5ConnectorBaseUrl());
            config.setAiEngineBaseUrl(dto.getConnectivity().getAiEngineBaseUrl());
            config.setEnableAiModel(dto.getConnectivity().isEnableAiModel());
        }

        config.setUserId(userId);
        config.setActive(true);
        config.setVersion(System.currentTimeMillis()); // Simple versioning

        return ResponseEntity.ok(repository.save(config));
    }

    @GetMapping("/config/active")
    public ResponseEntity<BotConfigurationDTO> getActiveConfig() {
        String userId = userContextService.getCurrentUserId();
        return repository.findByUserIdAndActiveTrue(userId)
                .map(this::mapToDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok().build());
    }

    @GetMapping("/config/list")
    public ResponseEntity<java.util.List<BotConfigurationDTO>> listConfigs() {
        String userId = userContextService.getCurrentUserId();
        var configs = repository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(entity -> {
                    BotConfigurationDTO dto = new BotConfigurationDTO();
                    dto.setId(entity.getId());
                    dto.setConfigName(entity.getConfigName());
                    dto.setMode(entity.getMode());
                    dto.setActive(entity.isActive());
                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(configs);
    }

    @GetMapping("/config/{id}")
    public ResponseEntity<BotConfigurationDTO> loadConfig(@PathVariable Long id) {
        return repository.findById(id)
                .map(this::mapToDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // We need ID in DTO or separate "SummaryDTO" to load by ID.
    // For simplicity, let's assume we load by Name or just add ID to DTO.
    // Let's add ID to DTO first.

    private BotConfigurationDTO mapToDto(BotConfiguration entity) {
        BotConfigurationDTO dto = new BotConfigurationDTO();
        dto.setId(entity.getId());
        dto.setConfigName(entity.getConfigName());
        dto.setActive(entity.isActive());
        dto.setMode(entity.getMode());
        dto.setSelectedStrategy(entity.getSelectedStrategy());

        BotConfigurationDTO.AiParameters ai = new BotConfigurationDTO.AiParameters();
        ai.setLookbackPeriod(entity.getAiLookbackPeriod());
        ai.setConfidenceThreshold(entity.getAiConfidenceThreshold());
        dto.setAiParameters(ai);

        BotConfigurationDTO.RiskParameters risk = new BotConfigurationDTO.RiskParameters();
        risk.setStopLossPercentage(entity.getStopLossPercentage());
        risk.setTakeProfitPercentage(entity.getTakeProfitPercentage());
        risk.setRiskRewardRatio(entity.getRiskRewardRatio());
        risk.setMaxDailyLossPct(entity.getMaxDailyLossPct());
        risk.setRiskPerTradePct(entity.getRiskPerTradePct());
        risk.setCooldownMinutesAfterLoss(entity.getCooldownMinutesAfterLoss());
        risk.setMaxOpenTrades(entity.getMaxOpenTrades());
        dto.setRiskParameters(risk);

        BotConfigurationDTO.ExecutionParameters exec = new BotConfigurationDTO.ExecutionParameters();
        exec.setSymbols(entity.getSymbols());
        exec.setTimeframe(entity.getTimeframe());
        exec.setAllowShort(entity.isAllowShort());
        dto.setExecutionParameters(exec);

        BotConfigurationDTO.ConnectivityParameters conn = new BotConfigurationDTO.ConnectivityParameters();
        conn.setAccountType(entity.getAccountType());
        conn.setMt5Login(entity.getMt5Login());
        // Do not return password
        conn.setMt5Server(entity.getMt5Server());
        conn.setMt5Path(entity.getMt5Path());
        conn.setMt5ConnectorBaseUrl(entity.getMt5ConnectorBaseUrl());
        conn.setAiEngineBaseUrl(entity.getAiEngineBaseUrl());
        conn.setEnableAiModel(entity.isEnableAiModel());
        dto.setConnectivity(conn);

        return dto;
    }
}
