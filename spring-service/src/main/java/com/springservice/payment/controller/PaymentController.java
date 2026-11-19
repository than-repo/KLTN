package com.springservice.payment.controller;

import java.net.URI;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.springservice.payment.dto.CreateSimulationPaymentRequest;
import com.springservice.payment.dto.CreateVnpayPaymentRequest;
import com.springservice.payment.dto.CreateVnpayPaymentResponse;
import com.springservice.payment.dto.GetPaymentsQuery;
import com.springservice.payment.dto.GetPaymentsResponse;
import com.springservice.payment.dto.SimulationPaymentResponse;
import com.springservice.payment.dto.VnpayIpnResponse;
import com.springservice.payment.dto.VnpayReturnQuery;
import com.springservice.payment.dto.VnpayReturnResponse;
import com.springservice.payment.dto.VnpayVerifyReturnResponse;
import com.springservice.payment.service.PaymentService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    // Create VNPay payment URL
    @PostMapping("/vnpay/create-payment-url")
    public ResponseEntity<CreateVnpayPaymentResponse> createVnpayPaymentUrl(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateVnpayPaymentRequest request,
            HttpServletRequest httpRequest) {

        String userId = jwt.getSubject();
        String ipAddr = getClientIpAddress(httpRequest);

        CreateVnpayPaymentResponse response = paymentService.createVnpayPayment(userId, request, ipAddr);

        return ResponseEntity.created(URI.create("/api/payments/" + response.getPaymentId()))
                .body(response);
    }

    // Create Simulation payment (for testing)
    @PostMapping("/simulation/create-payment")
    public ResponseEntity<SimulationPaymentResponse> createSimulationPayment(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateSimulationPaymentRequest request) {

        String userId = jwt.getSubject();
        SimulationPaymentResponse response = paymentService.createSimulationPayment(userId, request);

        return ResponseEntity.ok(response);
    }

    // Confirm simulation payment
    @PostMapping("/simulation/{paymentId}/confirm")
    public ResponseEntity<SimulationPaymentResponse> confirmSimulationPayment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {

        String userId = jwt.getSubject();
        SimulationPaymentResponse response = paymentService.confirmSimulationPayment(userId, paymentId);

        return ResponseEntity.ok(response);
    }

    // Fail simulation payment
    @PostMapping("/simulation/{paymentId}/fail")
    public ResponseEntity<SimulationPaymentResponse> failSimulationPayment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {

        String userId = jwt.getSubject();
        SimulationPaymentResponse response = paymentService.failSimulationPayment(userId, paymentId);

        return ResponseEntity.ok(response);
    }

    // VNPay Return URL (user redirected back from VNPay) - redirects to frontend
    @GetMapping("/vnpay/return")
    public ResponseEntity<VnpayReturnResponse> handleVnpayReturn(VnpayReturnQuery query) {
        VnpayReturnResponse response = paymentService.handleVnpayReturn(query);
        return ResponseEntity.ok(response);
    }

    // VNPay Verify Return (for frontend to check payment result)
    @GetMapping("/vnpay/verify-return")
    public ResponseEntity<VnpayVerifyReturnResponse> verifyVnpayReturn(VnpayReturnQuery query) {
        VnpayVerifyReturnResponse response = paymentService.verifyVnpayReturn(query);
        return ResponseEntity.ok(response);
    }

    // VNPay IPN (server-to-server notification)
    @PostMapping("/vnpay/ipn")
    public ResponseEntity<VnpayIpnResponse> handleVnpayIpn(
            @RequestParam Map<String, String> allParams) {
        // Convert Map to VnpayReturnQuery
        VnpayReturnQuery query = new VnpayReturnQuery();
        java.lang.reflect.Field[] fields = VnpayReturnQuery.class.getDeclaredFields();
        for (java.lang.reflect.Field field : fields) {
            field.setAccessible(true);
            try {
                com.fasterxml.jackson.annotation.JsonProperty ann = field.getAnnotation(com.fasterxml.jackson.annotation.JsonProperty.class);
                if (ann != null) {
                    String value = allParams.get(ann.value());
                    if (value != null) {
                        field.set(query, value);
                    }
                }
            } catch (IllegalAccessException e) {
                // ignore
            }
        }

        VnpayIpnResponse response = paymentService.handleVnpayIpn(query);
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

    private String getClientIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // If multiple IPs, take the first one
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}