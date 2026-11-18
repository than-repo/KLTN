package com.springservice.payment.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import com.springservice.payment.dto.VnpayIpnResponse;

@ControllerAdvice
public class PaymentExceptionHandler {

    @ExceptionHandler(CourseNotFoundException.class)
    public ResponseEntity<String> handleCourseNotFound(CourseNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(PaymentNotFoundException.class)
    public ResponseEntity<String> handlePaymentNotFound(PaymentNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(InvalidPaymentStateException.class)
    public ResponseEntity<String> handleInvalidPaymentState(InvalidPaymentStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(VnpaySignatureException.class)
    public ResponseEntity<VnpayIpnResponse> handleVnpaySignature(VnpaySignatureException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new VnpayIpnResponse("97", "Checksum failed"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }
}