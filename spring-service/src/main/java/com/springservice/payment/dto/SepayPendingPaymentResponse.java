package com.springservice.payment.dto;

import java.math.BigDecimal;

public record SepayPendingPaymentResponse(String paymentId, String txnRef, BigDecimal amount) {
}
