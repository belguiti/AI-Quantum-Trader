package com.aiquantum.auth.controller;

import com.aiquantum.auth.dto.AdminStatsDTO;
import com.aiquantum.auth.dto.AdminUserDTO;
import com.aiquantum.auth.service.AdminStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminController {

    private final AdminStatsService adminStatsService;

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDTO> getStats() {
        return ResponseEntity.ok(adminStatsService.getStats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserDTO>> getUsers() {
        return ResponseEntity.ok(adminStatsService.getAllUsers());
    }

    @PutMapping("/users/{id}/ban")
    public ResponseEntity<AdminUserDTO> toggleBan(@PathVariable Long id) {
        return ResponseEntity.ok(adminStatsService.toggleBan(id));
    }

    @PutMapping("/users/{id}/subscription")
    public ResponseEntity<AdminUserDTO> updateSubscription(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminStatsService.updateSubscription(
                id,
                body.get("subscriptionPlan"),
                body.get("paymentStatus")));
    }

    @PutMapping("/users/{id}/reset-usage")
    public ResponseEntity<Void> resetDataUsage(@PathVariable Long id) {
        adminStatsService.resetDataUsage(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<AdminUserDTO> updateRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminStatsService.updateRole(id, body.get("role")));
    }
}
