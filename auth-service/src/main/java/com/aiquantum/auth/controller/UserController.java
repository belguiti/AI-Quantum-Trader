package com.aiquantum.auth.controller;

import com.aiquantum.auth.dto.AuthResponse;
import com.aiquantum.auth.dto.UpdateProfileRequest;
import com.aiquantum.auth.service.AuthService;
import com.aiquantum.auth.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService service;

    @PutMapping("/profile")
    public ResponseEntity<AuthResponse> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(service.updateProfile(user.getId(), request));
    }
}
