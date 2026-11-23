package com.springservice.payment.exception;

public class SepaySignatureException extends RuntimeException {

    public SepaySignatureException(String message) {
        super(message);
    }

    public SepaySignatureException(String message, Throwable cause) {
        super(message, cause);
    }
}