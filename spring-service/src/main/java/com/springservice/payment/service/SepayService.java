package com.springservice.payment.service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;

import com.springservice.payment.config.SepayConfig;
import com.springservice.payment.dto.SepayCheckoutForm;
import com.springservice.payment.dto.SepayIpnRequest;
import com.springservice.payment.dto.SepayIpnResponse;
import com.springservice.payment.entity.Payment;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class SepayService {

    private final SepayConfig sepayConfig;

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final String OPERATION = "PURCHASE";
    private static final String CURRENCY = "VND";
    private static final String PAYMENT_METHOD = "BANK_TRANSFER";
    private static final String ORDER_DESCRIPTION = "Thanh toan khoa hoc";

    // Exact field order from SePay documentation for signature generation
    private static final List<String> SIGNED_FIELDS = List.of(
            "order_amount",
            "merchant",
            "currency",
            "operation",
            "order_description",
            "order_invoice_number",
            "customer_id",
            "payment_method",
            "success_url",
            "error_url",
            "cancel_url"
    );

    // Valid values for ORDER_PAID
    private static final String NOTIFICATION_TYPE_ORDER_PAID = "ORDER_PAID";
    private static final String NOTIFICATION_TYPE_TRANSACTION_VOID = "TRANSACTION_VOID";
    private static final String ORDER_STATUS_CAPTURED = "CAPTURED";
    private static final String TRANSACTION_STATUS_APPROVED = "APPROVED";
    private static final String TRANSACTION_TYPE_PAYMENT = "PAYMENT";
    private static final List<String> SUPPORTED_PAYMENT_METHODS = List.of(
            "BANK_TRANSFER", "CARD", "NAPAS_BANK_TRANSFER"
    );

    public SepayCheckoutForm createCheckoutForm(Payment payment) {
        validateConfiguration();

        Map<String, String> formFields = buildFormFields(payment);
        String signature = generateSignature(formFields);
        formFields.put("signature", signature);

        return SepayCheckoutForm.of(sepayConfig.getCheckoutUrl(), formFields);
    }

    private void validateConfiguration() {
        if (sepayConfig.getMerchantId() == null || sepayConfig.getMerchantId().isBlank()) {
            throw new IllegalStateException("SePay merchant ID not configured");
        }
        if (sepayConfig.getMerchantSecretKey() == null || sepayConfig.getMerchantSecretKey().isBlank()) {
            throw new IllegalStateException("SePay merchant secret key not configured");
        }
        if (sepayConfig.getSuccessUrl() == null || sepayConfig.getSuccessUrl().isBlank()) {
            throw new IllegalStateException("SePay success URL not configured");
        }
        if (sepayConfig.getErrorUrl() == null || sepayConfig.getErrorUrl().isBlank()) {
            throw new IllegalStateException("SePay error URL not configured");
        }
        if (sepayConfig.getCancelUrl() == null || sepayConfig.getCancelUrl().isBlank()) {
            throw new IllegalStateException("SePay cancel URL not configured");
        }
    }

    private Map<String, String> buildFormFields(Payment payment) {
        Map<String, String> fields = new LinkedHashMap<>();

        // Required fields
        fields.put("merchant", sepayConfig.getMerchantId());
        fields.put("currency", CURRENCY);
        fields.put("order_amount", String.valueOf(payment.getAmount()));
        fields.put("operation", OPERATION);
        fields.put("order_description", ORDER_DESCRIPTION);
        fields.put("order_invoice_number", payment.getTxnRef());

        // Optional but recommended fields
        if (payment.getUserId() != null) {
            fields.put("customer_id", payment.getUserId());
        }
        fields.put("payment_method", PAYMENT_METHOD);

        if (sepayConfig.getSuccessUrl() != null) {
            fields.put("success_url", sepayConfig.getSuccessUrl());
        }
        if (sepayConfig.getErrorUrl() != null) {
            fields.put("error_url", sepayConfig.getErrorUrl());
        }
        if (sepayConfig.getCancelUrl() != null) {
            fields.put("cancel_url", sepayConfig.getCancelUrl());
        }

        return fields;
    }

    private String generateSignature(Map<String, String> formFields) {
        StringBuilder signingString = new StringBuilder();
        boolean first = true;

        for (String fieldName : SIGNED_FIELDS) {
            String value = formFields.get(fieldName);
            // Skip empty fields, "0", or null values per SePay documentation
            if (value == null || value.isEmpty() || "0".equals(value)) {
                continue;
            }
            if (!first) {
                signingString.append(",");
            }
            signingString.append(fieldName).append("=").append(value);
            first = false;
        }

        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            SecretKeySpec secretKey = new SecretKeySpec(
                    sepayConfig.getMerchantSecretKey().getBytes(StandardCharsets.UTF_8),
                    HMAC_SHA256
            );
            mac.init(secretKey);
            byte[] hash = mac.doFinal(signingString.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Failed to generate HMAC-SHA256 signature", e);
        }
    }

    public boolean verifyIpnSignature(String providedSecret) {
        String expectedSecret = sepayConfig.getIpnSecretKey();
        if (expectedSecret == null || providedSecret == null) {
            log.warn("IPN secret validation failed: missing secret (expected={}, provided={})",
                    expectedSecret != null, providedSecret != null);
            return false;
        }
        // Constant-time comparison to prevent timing attacks
        return MessageDigest.isEqual(
                expectedSecret.getBytes(StandardCharsets.UTF_8),
                providedSecret.getBytes(StandardCharsets.UTF_8)
        );
    }

    public SepayIpnResponse processIpn(SepayIpnRequest request) {
        try {
            // Validate notification type
            if (request.getNotificationType() == null) {
                log.warn("IPN missing notification_type");
                return SepayIpnResponse.invalidNotification();
            }

            if (NOTIFICATION_TYPE_ORDER_PAID.equals(request.getNotificationType())) {
                return processOrderPaid(request);
            } else if (NOTIFICATION_TYPE_TRANSACTION_VOID.equals(request.getNotificationType())) {
                return processTransactionVoid(request);
            } else {
                log.warn("IPN unknown notification_type: {}", request.getNotificationType());
                return SepayIpnResponse.invalidNotification();
            }
        } catch (Exception e) {
            log.error("IPN processing error", e);
            return SepayIpnResponse.internalError();
        }
    }

    private SepayIpnResponse processOrderPaid(SepayIpnRequest request) {
        SepayIpnRequest.Order order = request.getOrder();
        SepayIpnRequest.Transaction transaction = request.getTransaction();

        if (order == null || transaction == null) {
            log.warn("IPN ORDER_PAID missing order or transaction");
            return SepayIpnResponse.invalidNotification();
        }

        // Validate order status
        if (!ORDER_STATUS_CAPTURED.equals(order.getOrderStatus())) {
            log.warn("IPN ORDER_PAID invalid order_status: {}", order.getOrderStatus());
            return SepayIpnResponse.invalidOrderStatus();
        }

        // Validate transaction status
        if (!TRANSACTION_STATUS_APPROVED.equals(transaction.getTransactionStatus())) {
            log.warn("IPN ORDER_PAID invalid transaction_status: {}", transaction.getTransactionStatus());
            return SepayIpnResponse.invalidTransactionStatus();
        }

        // Validate transaction type
        if (!TRANSACTION_TYPE_PAYMENT.equals(transaction.getTransactionType())) {
            log.warn("IPN ORDER_PAID invalid transaction_type: {}", transaction.getTransactionType());
            return SepayIpnResponse.invalidTransactionStatus();
        }

        // Validate payment method
        if (transaction.getPaymentMethod() == null ||
                !SUPPORTED_PAYMENT_METHODS.contains(transaction.getPaymentMethod())) {
            log.warn("IPN ORDER_PAID unsupported payment_method: {}", transaction.getPaymentMethod());
            return SepayIpnResponse.invalidPaymentMethod();
        }

        // These validations require the Payment entity - return codes for service layer to handle
        return SepayIpnResponse.success();
    }

    private SepayIpnResponse processTransactionVoid(SepayIpnRequest request) {
        SepayIpnRequest.Transaction transaction = request.getTransaction();

        if (transaction == null) {
            log.warn("IPN TRANSACTION_VOID missing transaction");
            return SepayIpnResponse.invalidNotification();
        }

        // For void, we check if transaction status indicates voided/cancelled/refunded
        String txnStatus = transaction.getTransactionStatus();
        if (txnStatus == null) {
            log.warn("IPN TRANSACTION_VOID missing transaction_status");
            return SepayIpnResponse.invalidTransactionStatus();
        }

        // Valid void statuses
        if (!List.of("VOIDED", "CANCELLED", "REFUNDED").contains(txnStatus)) {
            log.warn("IPN TRANSACTION_VOID invalid transaction_status for void: {}", txnStatus);
            return SepayIpnResponse.invalidTransactionStatus();
        }

        return SepayIpnResponse.success();
    }

    public void validateAmountAndCurrency(Payment payment, SepayIpnRequest request) {
        SepayIpnRequest.Order order = request.getOrder();
        SepayIpnRequest.Transaction transaction = request.getTransaction();

        // Validate order amount matches payment amount
        if (order.getOrderAmount() == null || !order.getOrderAmount().equals(payment.getAmount().longValue())) {
            throw new IllegalArgumentException("Order amount mismatch: expected " + payment.getAmount() + ", got " + order.getOrderAmount());
        }

        // Validate transaction amount matches payment amount
        if (transaction.getTransactionAmount() == null || !transaction.getTransactionAmount().equals(payment.getAmount().longValue())) {
            throw new IllegalArgumentException("Transaction amount mismatch: expected " + payment.getAmount() + ", got " + transaction.getTransactionAmount());
        }

        // Validate order currency
        if (order.getOrderCurrency() == null || !CURRENCY.equalsIgnoreCase(order.getOrderCurrency())) {
            throw new IllegalArgumentException("Order currency mismatch: expected " + CURRENCY + ", got " + order.getOrderCurrency());
        }

        // Validate transaction currency
        if (transaction.getTransactionCurrency() == null || !CURRENCY.equalsIgnoreCase(transaction.getTransactionCurrency())) {
            throw new IllegalArgumentException("Transaction currency mismatch: expected " + CURRENCY + ", got " + transaction.getTransactionCurrency());
        }
    }

    public boolean isOrderPaidNotification(String notificationType) {
        return NOTIFICATION_TYPE_ORDER_PAID.equals(notificationType);
    }

    public boolean isTransactionVoidNotification(String notificationType) {
        return NOTIFICATION_TYPE_TRANSACTION_VOID.equals(notificationType);
    }
}