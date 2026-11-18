package com.springservice.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationPaymentResponse {

    @JsonProperty("status")
    private String status; // "pending", "success", "already_paid", "failed"

    @JsonProperty("payment")
    private PaymentResponseDto payment;
}