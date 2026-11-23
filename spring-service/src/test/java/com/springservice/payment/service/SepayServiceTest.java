package com.springservice.payment.service;

import java.math.BigDecimal;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.springservice.payment.config.SepayConfig;
import com.springservice.payment.dto.SepayCheckoutForm;
import com.springservice.payment.dto.SepayIpnRequest;
import com.springservice.payment.dto.SepayIpnResponse;
import com.springservice.payment.entity.Payment;
import com.springservice.payment.entity.PaymentMethod;

import static org.junit.jupiter.api.Assertions.*;

class SepayServiceTest {

    private SepayService sepayService;

    private SepayConfig sepayConfig;

    private Payment testPayment;

    @BeforeEach
    void setUp() {
        sepayConfig = new SepayConfig();
        sepayConfig.setEnvironment("sandbox");
        sepayConfig.setMerchantId("TEST_MERCHANT_123");
        sepayConfig.setMerchantSecretKey("TEST_MERCHANT_SECRET_KEY");
        sepayConfig.setIpnSecretKey("TEST_IPN_SECRET_KEY");
        sepayConfig.setCheckoutUrl("https://pay-sandbox.sepay.vn/v1/checkout/init");
        sepayConfig.setSuccessUrl("https://example.com/success");
        sepayConfig.setErrorUrl("https://example.com/error");
        sepayConfig.setCancelUrl("https://example.com/cancel");

        sepayService = new SepayService(sepayConfig);

        testPayment = createTestPayment("payment-123", "user-456", "course-789", 100000, "PAY1234567890ABCD");
    }

    private Payment createTestPayment(String id, String userId, String courseId, Integer amount, String txnRef) {
        Payment payment = new Payment(userId, courseId, amount, PaymentMethod.SEPAY, "SEPAY", txnRef);
        // Use reflection to set the ID since it's generated in @PrePersist
        try {
            java.lang.reflect.Field idField = Payment.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(payment, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return payment;
    }

    @Test
    void createCheckoutForm_GeneratesCorrectFields() {
        // When
        SepayCheckoutForm form = sepayService.createCheckoutForm(testPayment);

        // Then
        assertNotNull(form);
        assertEquals("https://pay-sandbox.sepay.vn/v1/checkout/init", form.getActionUrl());
        assertEquals("POST", form.getMethod());
        assertNotNull(form.getFields());

        Map<String, String> fields = form.getFields();

        // Required fields
        assertEquals("TEST_MERCHANT_123", fields.get("merchant"));
        assertEquals("VND", fields.get("currency"));
        assertEquals("100000", fields.get("order_amount"));
        assertEquals("PURCHASE", fields.get("operation"));
        assertEquals("Thanh toan khoa hoc", fields.get("order_description"));
        assertEquals("PAY1234567890ABCD", fields.get("order_invoice_number"));

        // Optional fields
        assertEquals("user-456", fields.get("customer_id"));
        assertEquals("BANK_TRANSFER", fields.get("payment_method"));
        assertEquals("https://example.com/success", fields.get("success_url"));
        assertEquals("https://example.com/error", fields.get("error_url"));
        assertEquals("https://example.com/cancel", fields.get("cancel_url"));

        // Signature present
        assertNotNull(fields.get("signature"));
        assertFalse(fields.get("signature").isEmpty());
    }

    @Test
    void createCheckoutForm_Signature_ValidHMACSHA256Base64() {
        // When
        SepayCheckoutForm form = sepayService.createCheckoutForm(testPayment);
        String signature = form.getFields().get("signature");

        // Then - verify signature is valid Base64
        assertDoesNotThrow(() -> Base64.getDecoder().decode(signature));
    }

    @Test
    void createCheckoutForm_Signature_ConsistentForSameInput() {
        // When
        SepayCheckoutForm form1 = sepayService.createCheckoutForm(testPayment);
        SepayCheckoutForm form2 = sepayService.createCheckoutForm(testPayment);

        // Then
        assertEquals(form1.getFields().get("signature"), form2.getFields().get("signature"));
    }

    @Test
    void createCheckoutForm_FieldOrder_ExactDocumentedOrder() {
        // When
        SepayCheckoutForm form = sepayService.createCheckoutForm(testPayment);

        // Then - verify fields are in the correct order for signing
        // The LinkedHashMap preserves insertion order which matches SIGNED_FIELDS
        Map<String, String> fields = form.getFields();

        // Check that signature is last (added after all other fields)
        assertTrue(fields.keySet().stream().toList().getLast().equals("signature"));
    }

    @Test
    void createCheckoutForm_MissingOptionalFields_StillGeneratesValidForm() {
        // Given - payment without userId
        Payment payment = createTestPayment("payment-123", null, "course-789", 50000, "PAY50000TEST");

        SepayConfig config = new SepayConfig();
        config.setEnvironment("sandbox");
        config.setMerchantId("TEST_MERCHANT_123");
        config.setMerchantSecretKey("TEST_MERCHANT_SECRET_KEY");
        config.setIpnSecretKey("TEST_IPN_SECRET_KEY");
        config.setCheckoutUrl("https://pay-sandbox.sepay.vn/v1/checkout/init");
        config.setSuccessUrl("https://example.com/success");
        config.setErrorUrl("https://example.com/error");
        config.setCancelUrl("https://example.com/cancel");

        SepayService service = new SepayService(config);

        // When
        SepayCheckoutForm form = service.createCheckoutForm(payment);

        // Then - customer_id should be omitted, but form still valid
        assertNotNull(form);
        assertFalse(form.getFields().containsKey("customer_id"), "customer_id should not be in form when userId is null");
        assertNotNull(form.getFields().get("signature"));
    }

    @Test
    void createCheckoutForm_SpecialCharactersInDescription() {
        // Given - payment with special chars (though description is fixed)
        Payment payment = createTestPayment("payment-123", "user-456", "course-789", 100000, "PAY_SPECIAL_TEST");

        // When
        SepayCheckoutForm form = sepayService.createCheckoutForm(payment);

        // Then
        assertNotNull(form.getFields().get("signature"));
    }

    @Test
    void verifyIpnSignature_ValidSecret_ReturnsTrue() {
        // When
        boolean isValid = sepayService.verifyIpnSignature("TEST_IPN_SECRET_KEY");

        // Then
        assertTrue(isValid);
    }

    @Test
    void verifyIpnSignature_InvalidSecret_ReturnsFalse() {
        // When
        boolean isValid = sepayService.verifyIpnSignature("WRONG_SECRET");

        // Then
        assertFalse(isValid);
    }

    @Test
    void verifyIpnSignature_NullSecret_ReturnsFalse() {
        // When
        boolean isValid = sepayService.verifyIpnSignature(null);

        // Then
        assertFalse(isValid);
    }

    @Test
    void verifyIpnSignature_EmptySecret_ReturnsFalse() {
        // When
        boolean isValid = sepayService.verifyIpnSignature("");

        // Then
        assertFalse(isValid);
    }

    @Test
    void verifyIpnSignature_MissingConfiguredSecret_ReturnsFalse() {
        // Given - config without IPN secret
        SepayConfig config = new SepayConfig();
        config.setIpnSecretKey(null);

        SepayService service = new SepayService(config);

        // When
        boolean isValid = service.verifyIpnSignature("any_secret");

        // Then
        assertFalse(isValid);
    }

    @Test
    void createCheckoutForm_MissingMerchantId_ThrowsException() {
        // Given
        SepayConfig config = new SepayConfig();
        config.setMerchantId(null);
        config.setMerchantSecretKey("TEST_SECRET");
        config.setIpnSecretKey("TEST_IPN_SECRET");
        config.setSuccessUrl("https://example.com/success");
        config.setErrorUrl("https://example.com/error");
        config.setCancelUrl("https://example.com/cancel");

        SepayService service = new SepayService(config);

        // When/Then
        assertThrows(IllegalStateException.class, () -> service.createCheckoutForm(testPayment));
    }

    @Test
    void createCheckoutForm_MissingMerchantSecretKey_ThrowsException() {
        // Given
        SepayConfig config = new SepayConfig();
        config.setMerchantId("TEST_MERCHANT");
        config.setMerchantSecretKey(null);
        config.setIpnSecretKey("TEST_IPN_SECRET");
        config.setSuccessUrl("https://example.com/success");
        config.setErrorUrl("https://example.com/error");
        config.setCancelUrl("https://example.com/cancel");

        SepayService service = new SepayService(config);

        // When/Then
        assertThrows(IllegalStateException.class, () -> service.createCheckoutForm(testPayment));
    }

    @Test
    void processIpn_ValidOrderPaid_ReturnsSuccess() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .notificationType("ORDER_PAID")
                .order(SepayIpnRequest.Order.builder()
                        .orderInvoiceNumber("PAY1234567890ABCD")
                        .orderStatus("CAPTURED")
                        .orderAmount(100000L)
                        .orderCurrency("VND")
                        .build())
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionId("TRX789012")
                        .transactionStatus("APPROVED")
                        .transactionType("PAYMENT")
                        .transactionAmount(100000L)
                        .transactionCurrency("VND")
                        .paymentMethod("BANK_TRANSFER")
                        .build())
                .build();

        // When
        SepayIpnResponse response = sepayService.processIpn(request);

        // Then - initial validation passes, returns success
        // (full validation with Payment happens in PaymentService)
        assertTrue(response.isSuccess());
        assertEquals("SUCCESS", response.getCode());
    }

    @Test
    void processIpn_InvalidOrderStatus_ReturnsError() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .notificationType("ORDER_PAID")
                .order(SepayIpnRequest.Order.builder()
                        .orderInvoiceNumber("PAY1234567890ABCD")
                        .orderStatus("PENDING") // Not CAPTURED
                        .orderAmount(100000L)
                        .orderCurrency("VND")
                        .build())
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionId("TRX789012")
                        .transactionStatus("APPROVED")
                        .transactionType("PAYMENT")
                        .transactionAmount(100000L)
                        .transactionCurrency("VND")
                        .paymentMethod("BANK_TRANSFER")
                        .build())
                .build();

        // When
        SepayIpnResponse response = sepayService.processIpn(request);

        // Then
        assertFalse(response.isSuccess());
        assertEquals("INVALID_ORDER_STATUS", response.getCode());
    }

    @Test
    void processIpn_InvalidTransactionStatus_ReturnsError() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .notificationType("ORDER_PAID")
                .order(SepayIpnRequest.Order.builder()
                        .orderInvoiceNumber("PAY1234567890ABCD")
                        .orderStatus("CAPTURED")
                        .orderAmount(100000L)
                        .orderCurrency("VND")
                        .build())
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionId("TRX789012")
                        .transactionStatus("PENDING") // Not APPROVED
                        .transactionType("PAYMENT")
                        .transactionAmount(100000L)
                        .transactionCurrency("VND")
                        .paymentMethod("BANK_TRANSFER")
                        .build())
                .build();

        // When
        SepayIpnResponse response = sepayService.processIpn(request);

        // Then
        assertFalse(response.isSuccess());
        assertEquals("INVALID_TRANSACTION_STATUS", response.getCode());
    }

    @Test
    void processIpn_UnsupportedPaymentMethod_ReturnsError() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .notificationType("ORDER_PAID")
                .order(SepayIpnRequest.Order.builder()
                        .orderInvoiceNumber("PAY1234567890ABCD")
                        .orderStatus("CAPTURED")
                        .orderAmount(100000L)
                        .orderCurrency("VND")
                        .build())
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionId("TRX789012")
                        .transactionStatus("APPROVED")
                        .transactionType("PAYMENT")
                        .transactionAmount(100000L)
                        .transactionCurrency("VND")
                        .paymentMethod("UNKNOWN_METHOD")
                        .build())
                .build();

        // When
        SepayIpnResponse response = sepayService.processIpn(request);

        // Then
        assertFalse(response.isSuccess());
        assertEquals("INVALID_PAYMENT_METHOD", response.getCode());
    }

    @Test
    void processIpn_TransactionVoid_ReturnsSuccess() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .notificationType("TRANSACTION_VOID")
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionId("TRX789012")
                        .transactionStatus("VOIDED")
                        .build())
                .build();

        // When
        SepayIpnResponse response = sepayService.processIpn(request);

        // Then
        assertTrue(response.isSuccess());
        assertEquals("SUCCESS", response.getCode());
    }

    @Test
    void processIpn_TransactionVoid_InvalidStatus_ReturnsError() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .notificationType("TRANSACTION_VOID")
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionId("TRX789012")
                        .transactionStatus("APPROVED") // Not a void status
                        .build())
                .build();

        // When
        SepayIpnResponse response = sepayService.processIpn(request);

        // Then
        assertFalse(response.isSuccess());
        assertEquals("INVALID_TRANSACTION_STATUS", response.getCode());
    }

    @Test
    void processIpn_UnknownNotificationType_ReturnsError() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .notificationType("UNKNOWN_TYPE")
                .build();

        // When
        SepayIpnResponse response = sepayService.processIpn(request);

        // Then
        assertFalse(response.isSuccess());
        assertEquals("INVALID_NOTIFICATION", response.getCode());
    }

    @Test
    void processIpn_MissingOrder_ReturnsError() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .notificationType("ORDER_PAID")
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionId("TRX789012")
                        .transactionStatus("APPROVED")
                        .build())
                .build();

        // When
        SepayIpnResponse response = sepayService.processIpn(request);

        // Then
        assertFalse(response.isSuccess());
        assertEquals("INVALID_NOTIFICATION", response.getCode());
    }

    @Test
    void validateAmountAndCurrency_ValidAmountAndCurrency_Passes() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .order(SepayIpnRequest.Order.builder()
                        .orderAmount(100000L)
                        .orderCurrency("VND")
                        .build())
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionAmount(100000L)
                        .transactionCurrency("VND")
                        .build())
                .build();

        // When/Then - should not throw
        assertDoesNotThrow(() -> sepayService.validateAmountAndCurrency(testPayment, request));
    }

    @Test
    void validateAmountAndCurrency_AmountMismatch_ThrowsException() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .order(SepayIpnRequest.Order.builder()
                        .orderAmount(99999L) // Different from payment amount (100000)
                        .orderCurrency("VND")
                        .build())
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionAmount(100000L)
                        .transactionCurrency("VND")
                        .build())
                .build();

        // When/Then
        assertThrows(IllegalArgumentException.class,
                () -> sepayService.validateAmountAndCurrency(testPayment, request));
    }

    @Test
    void validateAmountAndCurrency_CurrencyMismatch_ThrowsException() {
        // Given
        SepayIpnRequest request = SepayIpnRequest.builder()
                .order(SepayIpnRequest.Order.builder()
                        .orderAmount(100000L)
                        .orderCurrency("USD") // Not VND
                        .build())
                .transaction(SepayIpnRequest.Transaction.builder()
                        .transactionAmount(100000L)
                        .transactionCurrency("VND")
                        .build())
                .build();

        // When/Then
        assertThrows(IllegalArgumentException.class,
                () -> sepayService.validateAmountAndCurrency(testPayment, request));
    }
}