package com.aiquantum.trade.dto;

import lombok.Data;

@Data
public class ManualConfirmDTO {
    private Long opportunityId;
    private Double overrideSl;
    private Double overrideTp;
}
