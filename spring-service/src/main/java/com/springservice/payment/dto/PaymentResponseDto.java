package com.springservice.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import com.springservice.payment.entity.PaymentMethod;
import com.springservice.payment.entity.PaymentStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponseDto {

    @JsonProperty("id")
    private String id;

    @JsonProperty("userId")
    private String userId;

    @JsonProperty("courseId")
    private String courseId;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("paymentMethod")
    private PaymentMethod paymentMethod;

    @JsonProperty("status")
    private PaymentStatus status;

    @JsonProperty("provider")
    private String provider;

    @JsonProperty("txnRef")
    private String txnRef;

    @JsonProperty("providerPaymentId")
    private String providerPaymentId;

    @JsonProperty("paidAt")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime paidAt;

    @JsonProperty("createdAt")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonProperty("updatedAt")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}