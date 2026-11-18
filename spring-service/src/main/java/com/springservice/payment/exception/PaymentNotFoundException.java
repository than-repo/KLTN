package com.springservice.payment.exception;

public class PaymentNotFoundException extends RuntimeException {

    public PaymentNotFoundException(String paymentId) {
        super("Payment not found: " + paymentId);
    }

    public PaymentNotFoundException(String message, String paymentId) {
        super(message + ": " + paymentId);
    }
}