package com.aiquantum.trade.service;

import com.aiquantum.trade.model.UserProfile;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserContextService {

    private final HttpServletRequest request;
    private final ObjectMapper objectMapper;

    public UserProfile getCurrentUser() {
        String userId = getCurrentUserId();
        if ("unknown".equals(userId)) {
            return null;
        }

        // Return a simple profile construct from token data
        // For now, we don't have role in token, defaulting to USER
        return UserProfile.builder()
                .id(userId)
                .username("Trader-" + userId)
                .email(userId + "@example.com")
                .role("USER")
                .build();
    }

    public String getCurrentUserId() {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String[] chunks = token.split("\\.");
                if (chunks.length > 1) {
                    java.util.Base64.Decoder decoder = java.util.Base64.getUrlDecoder();
                    String payload = new String(decoder.decode(chunks[1]));
                    Map<String, Object> claims = objectMapper.readValue(payload, Map.class);

                    // Try distinct claim names
                    if (claims.containsKey("user_id")) {
                        return String.valueOf(claims.get("user_id"));
                    } else if (claims.containsKey("userId")) {
                        return String.valueOf(claims.get("userId"));
                    } else if (claims.containsKey("sub")) {
                        return String.valueOf(claims.get("sub"));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to extract user from token", e);
        }

        return "unknown"; // Return unknown instead of hardcoded user-123
    }
}
