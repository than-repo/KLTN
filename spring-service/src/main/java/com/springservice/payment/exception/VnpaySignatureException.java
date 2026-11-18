package com.springservice.payment.exception;

public class VnpaySignatureException extends RuntimeException {

    public VnpaySignatureException(String message) {
        super(message);
    }
}