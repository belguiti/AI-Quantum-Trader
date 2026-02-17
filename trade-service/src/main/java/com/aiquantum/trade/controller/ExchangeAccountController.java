package com.aiquantum.trade.controller;

import com.aiquantum.trade.model.ExchangeAccount;
import com.aiquantum.trade.service.ExchangeAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exchange-accounts")
@RequiredArgsConstructor
public class ExchangeAccountController {

    private final ExchangeAccountService service;

    @GetMapping
    public ResponseEntity<List<ExchangeAccount>> listMyAccounts() {
        var accounts = service.getMyAccounts();
        // Mask passwords for security in the list
        accounts.forEach(a -> a.setPassword(null));
        return ResponseEntity.ok(accounts);
    }
}
