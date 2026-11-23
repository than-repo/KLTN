package com.springservice.payment.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSepayPaymentResponse {

    @JsonProperty("paymentId")
    private String paymentId;

    @JsonProperty("txnRef")
    private String txnRef;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("checkoutForm")
    private SepayCheckoutForm checkoutForm;
}