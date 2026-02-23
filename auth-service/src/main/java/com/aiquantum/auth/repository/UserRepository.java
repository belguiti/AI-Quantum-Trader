package com.aiquantum.auth.repository;

import com.aiquantum.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    long countByActiveTrue();

    long countByActiveFalse();

    long countBySubscriptionPlan(User.SubscriptionPlan plan);

    long countByPaymentStatus(User.PaymentStatus status);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :since")
    long countByCreatedAtAfter(LocalDateTime since);

    @Query(value = """
            SELECT CAST(created_at AS DATE) as day, COUNT(*) as cnt
            FROM users
            WHERE created_at >= :since
            GROUP BY CAST(created_at AS DATE)
            ORDER BY day ASC
            """, nativeQuery = true)
    List<Object[]> getUserGrowthSince(LocalDateTime since);
}
