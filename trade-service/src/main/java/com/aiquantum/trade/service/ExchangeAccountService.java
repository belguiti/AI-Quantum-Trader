package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.BotConfigurationDTO;
import com.aiquantum.trade.model.ExchangeAccount;
import com.aiquantum.trade.repository.ExchangeAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ExchangeAccountService {

    private final ExchangeAccountRepository repository;
    private final UserContextService userContextService;

    public List<ExchangeAccount> getMyAccounts() {
        return repository.findByUserId(userContextService.getCurrentUserId());
    }

    @Transactional
    public ExchangeAccount saveAccountOnConnection(BotConfigurationDTO.ConnectivityParameters params) {
        if (params.getMt5Login() == null)
            return null;

        String userId = userContextService.getCurrentUserId();
        String login = String.valueOf(params.getMt5Login());
        String server = params.getMt5Server();

        Optional<ExchangeAccount> existing = repository.findByUserIdAndLoginAndServer(userId, login, server);

        ExchangeAccount account;
        if (existing.isPresent()) {
            account = existing.get();
            account.setLastConnectedAt(LocalDateTime.now());
            // Update details if changed (e.g. password)
            if (params.getMt5Password() != null && !params.getMt5Password().isEmpty()) {
                account.setPassword(params.getMt5Password());
            }
            account.setPath(params.getMt5Path());
        } else {
            account = ExchangeAccount.builder()
                    .userId(userId)
                    .name("MT5 (" + params.getAccountType() + ") - " + login)
                    .broker("MT5") // Default
                    .accountType(params.getAccountType()) // DEMO/REAL
                    .login(login)
                    .password(params.getMt5Password())
                    .server(server)
                    .path(params.getMt5Path())
                    .lastConnectedAt(LocalDateTime.now())
                    .build();
        }
        return repository.save(account);
    }
}
