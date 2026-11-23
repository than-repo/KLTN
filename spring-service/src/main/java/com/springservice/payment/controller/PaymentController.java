package com.springservice.payment.controller;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.springservice.payment.dto.CreateSepayPaymentRequest;
import com.springservice.payment.dto.CreateSepayPaymentResponse;
import com.springservice.payment.dto.CreateSimulationPaymentRequest;
import com.springservice.payment.dto.GetPaymentsQuery;
import com.springservice.payment.dto.GetPaymentsResponse;
import com.springservice.payment.dto.SepayIpnRequest;
import com.springservice.payment.dto.SepayIpnResponse;
import com.springservice.payment.dto.SepayReturnQuery;
import com.springservice.payment.dto.SepayReturnResponse;
import com.springservice.payment.dto.SimulationPaymentResponse;
import com.springservice.payment.service.PaymentService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    // Create SePay payment
    @PostMapping("/sepay/create-payment")
    public ResponseEntity<CreateSepayPaymentResponse> createSepayPayment(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateSepayPaymentRequest request) {

        String userId = jwt.getSubject();

        CreateSepayPaymentResponse response = paymentService.createSepayPayment(userId, request);

        return ResponseEntity.created(URI.create("/api/payments/" + response.getPaymentId()))
                .body(response);
    }

    // Create Simulation payment (for testing) - PRESERVED
    @PostMapping("/simulation/create-payment")
    public ResponseEntity<SimulationPaymentResponse> createSimulationPayment(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateSimulationPaymentRequest request) {

        String userId = jwt.getSubject();
        SimulationPaymentResponse response = paymentService.createSimulationPayment(userId, request);

        return ResponseEntity.ok(response);
    }

    // Confirm simulation payment - PRESERVED
    @PostMapping("/simulation/{paymentId}/confirm")
    public ResponseEntity<SimulationPaymentResponse> confirmSimulationPayment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {

        String userId = jwt.getSubject();
        SimulationPaymentResponse response = paymentService.confirmSimulationPayment(userId, paymentId);

        return ResponseEntity.ok(response);
    }

    // Fail simulation payment - PRESERVED
    @PostMapping("/simulation/{paymentId}/fail")
    public ResponseEntity<SimulationPaymentResponse> failSimulationPayment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {

        String userId = jwt.getSubject();
        SimulationPaymentResponse response = paymentService.failSimulationPayment(userId, paymentId);

        return ResponseEntity.ok(response);
    }

    // SePay Return URL (browser redirect from SePay) - public endpoint
    @GetMapping("/sepay/return")
    public ResponseEntity<SepayReturnResponse> handleSepayReturn(SepayReturnQuery query) {
        SepayReturnResponse response = paymentService.handleSepayReturn(query);
        return ResponseEntity.ok(response);
    }

    // SePay IPN (server-to-server notification) - public endpoint
    @PostMapping("/sepay/ipn")
    public ResponseEntity<SepayIpnResponse> handleSepayIpn(
            @RequestHeader("X-Secret-Key") String secretKey,
            @RequestBody SepayIpnRequest request) {

        SepayIpnResponse response = paymentService.handleSepayIpn(secretKey, request);

        // SePay expects HTTP 200 for all acknowledged responses
        // Only return 500 for internal errors that should trigger retry
        if (!response.isSuccess() && "INTERNAL_ERROR".equals(response.getCode())) {
            return ResponseEntity.internalServerError().body(response);
        }
        return ResponseEntity.ok(response);
    }

    // Get learner payment history
    @GetMapping("/me")
    public ResponseEntity<GetPaymentsResponse> getLearnerPayments(
            @AuthenticationPrincipal Jwt jwt,
            GetPaymentsQuery query) {

        String userId = jwt.getSubject();
        GetPaymentsResponse response = paymentService.getLearnerPayments(userId, query);

        return ResponseEntity.ok(response);
    }
}