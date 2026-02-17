package com.aiquantum.trade.repository;

import com.aiquantum.trade.model.ExchangeAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExchangeAccountRepository extends JpaRepository<ExchangeAccount, Long> {
    List<ExchangeAccount> findByUserId(String userId);

    Optional<ExchangeAccount> findByUserIdAndLoginAndServer(String userId, String login, String server);
}
