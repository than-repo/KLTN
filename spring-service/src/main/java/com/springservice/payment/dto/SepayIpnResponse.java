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
public class SepayIpnResponse {

    @JsonProperty("success")
    private boolean success;

    @JsonProperty("code")
    private String code;

    @JsonProperty("message")
    private String message;

    public static SepayIpnResponse success() {
        return SepayIpnResponse.builder()
                .success(true)
                .code("SUCCESS")
                .message("Notification processed")
                .build();
    }

    public static SepayIpnResponse alreadyProcessed() {
        return SepayIpnResponse.builder()
                .success(true)
                .code("ALREADY_PROCESSED")
                .message("Notification already processed")
                .build();
    }

    public static SepayIpnResponse invalidSignature() {
        return SepayIpnResponse.builder()
                .success(false)
                .code("INVALID_SIGNATURE")
                .message("Invalid IPN signature")
                .build();
    }

    public static SepayIpnResponse invalidNotification() {
        return SepayIpnResponse.builder()
                .success(false)
                .code("INVALID_NOTIFICATION")
                .message("Invalid notification type")
                .build();
    }

    public static SepayIpnResponse orderNotFound() {
        return SepayIpnResponse.builder()
                .success(false)
                .code("ORDER_NOT_FOUND")
                .message("Order not found")
                .build();
    }

    public static SepayIpnResponse amountMismatch() {
        return SepayIpnResponse.builder()
                .success(false)
                .code("AMOUNT_MISMATCH")
                .message("Amount mismatch")
                .build();
    }

    public static SepayIpnResponse currencyMismatch() {
        return SepayIpnResponse.builder()
                .success(false)
                .code("CURRENCY_MISMATCH")
                .message("Currency mismatch")
                .build();
    }

    public static SepayIpnResponse invalidOrderStatus() {
        return SepayIpnResponse.builder()
                .success(false)
                .code("INVALID_ORDER_STATUS")
                .message("Invalid order status")
                .build();
    }

    public static SepayIpnResponse invalidTransactionStatus() {
        return SepayIpnResponse.builder()
                .success(false)
                .code("INVALID_TRANSACTION_STATUS")
                .message("Invalid transaction status")
                .build();
    }

    public static SepayIpnResponse invalidPaymentMethod() {
        return SepayIpnResponse.builder()
                .success(false)
                .code("INVALID_PAYMENT_METHOD")
                .message("Unsupported payment method")
                .build();
    }

    public static SepayIpnResponse internalError() {
        return SepayIpnResponse.builder()
                .success(false)
                .code("INTERNAL_ERROR")
                .message("Internal processing error")
                .build();
    }
}