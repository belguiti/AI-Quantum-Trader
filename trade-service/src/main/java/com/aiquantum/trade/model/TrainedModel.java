package com.aiquantum.trade.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "trained_models")
public class TrainedModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String symbol;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String parameters; // JSON string of best parameters

    @Column(columnDefinition = "TEXT")
    private String metrics; // JSON string of performance metrics

    private LocalDateTime trainingDate;

    private boolean isDeployed;
}
