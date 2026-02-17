package com.aiquantum.trade.controller;

import com.aiquantum.trade.dto.BotConfigurationDTO;
import com.aiquantum.trade.dto.ConnectivityTestResultDTO;
import com.aiquantum.trade.service.Mt5ConnectorClient;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/connectivity")
@RequiredArgsConstructor
public class ConnectivityController {

    private final Mt5ConnectorClient mt5Client;
    private final com.aiquantum.trade.repository.BotConfigurationRepository botConfigRepo;
    private final com.aiquantum.trade.service.UserContextService userContextService;
    private final com.aiquantum.trade.service.ExchangeAccountService exchangeAccountService;
    private final com.aiquantum.trade.repository.ExchangeAccountRepository exchangeAccountRepo;

    @PostMapping("/test")
    public ConnectivityTestResultDTO testConnection(@RequestBody BotConfigurationDTO.ConnectivityParameters config) {
        String userId = userContextService.getCurrentUserId();

        // If credentials are missing (e.g. password not sent from frontend), try to
        // load
        if (config.getMt5Password() == null || config.getMt5Password().isEmpty()) {

            // 1. Try active config first
            var savedOpt = botConfigRepo.findByUserIdAndActiveTrue(userId);
            if (savedOpt.isPresent()) {
                var saved = savedOpt.get();
                if (config.getMt5Login() == null)
                    config.setMt5Login(saved.getMt5Login());

                // Only use active config if it matches the requested login (or if login was
                // null/inferred)
                if (config.getMt5Login().equals(saved.getMt5Login())) {
                    config.setMt5Password(saved.getMt5Password());
                    if (config.getMt5Path() == null || config.getMt5Path().isEmpty()) {
                        config.setMt5Path(saved.getMt5Path());
                    }
                }
            }

            // 2. If still no password, try ExchangeAccount repo
            if (config.getMt5Password() == null || config.getMt5Password().isEmpty()) {
                if (config.getMt5Login() != null && config.getMt5Server() != null) {
                    var accountOpt = exchangeAccountRepo.findByUserIdAndLoginAndServer(userId,
                            String.valueOf(config.getMt5Login()), config.getMt5Server());
                    if (accountOpt.isPresent()) {
                        System.out
                                .println("DEBUG: Found stored ExchangeAccount credentials for " + config.getMt5Login());
                        config.setMt5Password(accountOpt.get().getPassword());
                        if (config.getMt5Path() == null || config.getMt5Path().isEmpty()) {
                            config.setMt5Path(accountOpt.get().getPath());
                        }
                    }
                }
            }
        }

        if (config.getMt5Password() == null || config.getMt5Password().isEmpty()) {
            ConnectivityTestResultDTO result = new ConnectivityTestResultDTO();
            result.setMt5Connected(false);
            result.setMt5Message("Password is required. Please check your configuration.");
            return result;
        }

        ConnectivityTestResultDTO result = mt5Client.testConnection(config);

        // Auto-save successful connection
        if (result.isMt5Connected()) {
            try {
                exchangeAccountService.saveAccountOnConnection(config);
            } catch (Exception e) {
                System.err.println("Failed to auto-save exchange account: " + e.getMessage());
            }
        }

        return result;
    }
}
