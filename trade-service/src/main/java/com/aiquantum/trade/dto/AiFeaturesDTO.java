package com.aiquantum.trade.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AiFeaturesDTO {
    private List<Double> features;

    @JsonProperty("news_headline")
    private String newsHeadline;
}
