package com.springservice.payment.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GetPaymentsQuery {

    @Min(value = 1, message = "Page must be at least 1")
    @JsonProperty("page")
    private Integer page = 1;

    @Min(value = 1, message = "Limit must be at least 1")
    @Max(value = 50, message = "Limit must not exceed 50")
    @JsonProperty("limit")
    private Integer limit = 10;
}