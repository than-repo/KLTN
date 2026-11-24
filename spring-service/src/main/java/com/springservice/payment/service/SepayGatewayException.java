package com.springservice.payment.service;

public class SepayGatewayException extends RuntimeException {

    public SepayGatewayException(String message) {
        super(message);
    }

    public SepayGatewayException(String message, Throwable cause) {
        super(message, cause);
    }
}
