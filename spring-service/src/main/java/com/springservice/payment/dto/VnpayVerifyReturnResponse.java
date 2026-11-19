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
public class VnpayVerifyReturnResponse {

    @JsonProperty("status")
    private String status; // "success", "failed", "already_paid"

    @JsonProperty("payment")
    private PaymentResponseDto payment;
}