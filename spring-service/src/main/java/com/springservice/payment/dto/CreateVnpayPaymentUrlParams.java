package com.springservice.payment.dto;

import java.math.BigDecimal;

public record CreateVnpayPaymentUrlParams(
        String txnRef,
        BigDecimal amount,
        String orderInfo,
        String ipAddr,
        String bankCode,
        String locale) {
}