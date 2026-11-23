package com.springservice.payment.controller;

import java.math.BigDecimal;
import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.springservice.payment.dto.CreateSepayPaymentRequest;
import com.springservice.payment.dto.CreateSepayPaymentResponse;
import com.springservice.payment.dto.CreateSimulationPaymentRequest;
import com.springservice.payment.dto.GetPaymentsResponse;
import com.springservice.payment.dto.SepayCheckoutForm;
import com.springservice.payment.dto.SepayIpnRequest;
import com.springservice.payment.dto.SepayIpnResponse;
import com.springservice.payment.dto.SepayReturnQuery;
import com.springservice.payment.dto.SepayReturnResponse;
import com.springservice.payment.dto.SimulationPaymentResponse;
import com.springservice.payment.entity.Payment;
import com.springservice.payment.entity.PaymentMethod;
import com.springservice.payment.entity.PaymentStatus;
import com.springservice.payment.client.CourseClient;
import com.springservice.payment.repository.PaymentRepository;
import com.springservice.payment.repository.EnrollmentRepository;
import com.springservice.wishlist.repository.WishlistRepository;
import com.springservice.payment.service.PaymentService;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@EnableAutoConfiguration(exclude = {
        org.springframework.cloud.client.discovery.simple.SimpleDiscoveryClientAutoConfiguration.class,
        org.springframework.cloud.openfeign.FeignAutoConfiguration.class,
        org.springframework.cloud.openfeign.loadbalancer.FeignLoadBalancerAutoConfiguration.class,
        org.springframework.cloud.autoconfigure.LifecycleMvcEndpointAutoConfiguration.class,
        org.springframework.cloud.autoconfigure.RefreshAutoConfiguration.class,
        org.springframework.cloud.configuration.CompatibilityVerifierAutoConfiguration.class
})
@Import({PaymentControllerTest.TestConfig.class, PaymentControllerTest.TestSecurityConfig.class})
@ComponentScan(basePackages = "com.springservice.payment")
class PaymentControllerTest {

    @Configuration
    static class TestConfig {
        private static final Jwt TEST_JWT = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("sub", "user-123")
                .claim("role", "LEARNER")
                .build();

        @Bean
        JwtDecoder jwtDecoder() {
            return token -> {
                if ("test-token".equals(token)) {
                    return TEST_JWT;
                }
                throw new org.springframework.security.oauth2.jwt.BadJwtException("Invalid token");
            };
        }

        @Bean
        @Primary
        CourseClient courseClient() {
            return org.mockito.Mockito.mock(CourseClient.class);
        }

        @Bean
        @Primary
        PaymentRepository paymentRepository() {
            return org.mockito.Mockito.mock(PaymentRepository.class);
        }

        @Bean
        @Primary
        EnrollmentRepository enrollmentRepository() {
            return org.mockito.Mockito.mock(EnrollmentRepository.class);
        }

        @Bean
        @Primary
        WishlistRepository wishlistRepository() {
            return org.mockito.Mockito.mock(WishlistRepository.class);
        }
    }

    @Configuration
    @EnableWebSecurity
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
            http
                    .csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(auth -> auth
                            .requestMatchers("/api/payments/sepay/return").permitAll()
                            .requestMatchers("/api/payments/sepay/ipn").permitAll()
                            .anyRequest().authenticated())
                    .oauth2ResourceServer(oauth2 -> oauth2
                            .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtToken -> {
                                List<SimpleGrantedAuthority> authorities = Collections.emptyList();
                                if (jwtToken.getClaimAsString("role") != null) {
                                    authorities = Collections.singletonList(
                                            new SimpleGrantedAuthority("ROLE_" + jwtToken.getClaimAsString("role")));
                                }
                                return new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                                        jwtToken.getSubject(), null, authorities);
                            })));
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    private ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private PaymentService paymentService;

    @MockitoBean
    private CourseClient courseClient;

    private Jwt testJwt = TestConfig.TEST_JWT;

    // SePay Payment Creation Tests
    @Test
    void createSepayPayment_Success() throws Exception {
        // Given
        CreateSepayPaymentRequest request = new CreateSepayPaymentRequest();
        request.setCourseId("course-456");

        SepayCheckoutForm checkoutForm = SepayCheckoutForm.builder()
                .actionUrl("https://pay-sandbox.sepay.vn/v1/checkout/init")
                .method("POST")
                .fields(java.util.Map.of(
                        "merchant", "TEST_MERCHANT",
                        "order_amount", "100000",
                        "signature", "test_signature"
                ))
                .build();

        CreateSepayPaymentResponse response = new CreateSepayPaymentResponse(
                "payment-789",
                "PAY1234567890ABCD",
                BigDecimal.valueOf(100000),
                checkoutForm
        );

        when(paymentService.createSepayPayment(eq("user-123"), any(CreateSepayPaymentRequest.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/sepay/create-payment")
                        .with(jwt().jwt(testJwt))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentId").value("payment-789"))
                .andExpect(jsonPath("$.txnRef").value("PAY1234567890ABCD"))
                .andExpect(jsonPath("$.amount").value(100000))
                .andExpect(jsonPath("$.checkoutForm.actionUrl").value(containsString("pay-sandbox.sepay.vn")));
    }

    @Test
    void createSepayPayment_Unauthorized() throws Exception {
        // Given
        CreateSepayPaymentRequest request = new CreateSepayPaymentRequest();
        request.setCourseId("course-456");

        // When/Then
        mockMvc.perform(post("/api/payments/sepay/create-payment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // Simulation Payment Tests (PRESERVED - Regression)
    @Test
    void createSimulationPayment_Success() throws Exception {
        // Given
        CreateSimulationPaymentRequest request = new CreateSimulationPaymentRequest();
        request.setCourseId("course-456");

        SimulationPaymentResponse response = new SimulationPaymentResponse("pending", null);

        when(paymentService.createSimulationPayment(eq("user-123"), any(CreateSimulationPaymentRequest.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/simulation/create-payment")
                        .with(jwt().jwt(testJwt))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("pending"));
    }

    @Test
    void confirmSimulationPayment_Success() throws Exception {
        // Given
        String paymentId = "payment-789";

        SimulationPaymentResponse response = new SimulationPaymentResponse("success", null);

        when(paymentService.confirmSimulationPayment(eq("user-123"), eq(paymentId)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/simulation/{paymentId}/confirm", paymentId)
                        .with(jwt().jwt(testJwt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));
    }

    @Test
    void failSimulationPayment_Success() throws Exception {
        // Given
        String paymentId = "payment-789";

        SimulationPaymentResponse response = new SimulationPaymentResponse("failed", null);

        when(paymentService.failSimulationPayment(eq("user-123"), eq(paymentId)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/simulation/{paymentId}/fail", paymentId)
                        .with(jwt().jwt(testJwt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("failed"));
    }

    // SePay Return URL Tests
    @Test
    void handleSepayReturn_Success() throws Exception {
        // Given
        SepayReturnResponse response = new SepayReturnResponse("success", null);

        when(paymentService.handleSepayReturn(any(SepayReturnQuery.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(get("/api/payments/sepay/return")
                        .param("order_invoice_number", "PAY1234567890ABCD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));
    }

    @Test
    void handleSepayReturn_AlreadyPaid() throws Exception {
        // Given
        SepayReturnResponse response = new SepayReturnResponse("already_paid", null);

        when(paymentService.handleSepayReturn(any(SepayReturnQuery.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(get("/api/payments/sepay/return")
                        .param("order_invoice_number", "PAY1234567890ABCD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("already_paid"));
    }

    // SePay IPN Tests
    @Test
    void handleSepayIpn_Success() throws Exception {
        // Given
        SepayIpnResponse response = SepayIpnResponse.success();

        when(paymentService.handleSepayIpn(eq("valid_secret"), any(SepayIpnRequest.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/sepay/ipn")
                        .header("X-Secret-Key", "valid_secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "notification_type": "ORDER_PAID",
                                    "order": {
                                        "order_invoice_number": "PAY1234567890ABCD",
                                        "order_status": "CAPTURED",
                                        "order_amount": 100000,
                                        "order_currency": "VND"
                                    },
                                    "transaction": {
                                        "transaction_id": "TRX789012",
                                        "transaction_status": "APPROVED",
                                        "transaction_type": "PAYMENT",
                                        "transaction_amount": 100000,
                                        "transaction_currency": "VND",
                                        "payment_method": "BANK_TRANSFER"
                                    }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));
    }

    @Test
    void handleSepayIpn_InvalidSecret() throws Exception {
        // Given
        SepayIpnResponse response = SepayIpnResponse.invalidSignature();

        when(paymentService.handleSepayIpn(eq("invalid_secret"), any(SepayIpnRequest.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/sepay/ipn")
                        .header("X-Secret-Key", "invalid_secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "notification_type": "ORDER_PAID",
                                    "order": {"order_invoice_number": "PAY1234567890ABCD"}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("INVALID_SIGNATURE"));
    }

    @Test
    void handleSepayIpn_MissingSecret() throws Exception {
        // When/Then - Missing X-Secret-Key header
        mockMvc.perform(post("/api/payments/sepay/ipn")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "notification_type": "ORDER_PAID",
                                    "order": {"order_invoice_number": "PAY1234567890ABCD"}
                                }
                                """))
                .andExpect(status().isBadRequest()); // Missing required header
    }

    @Test
    void handleSepayIpn_OrderNotFound() throws Exception {
        // Given
        SepayIpnResponse response = SepayIpnResponse.orderNotFound();

        when(paymentService.handleSepayIpn(eq("valid_secret"), any(SepayIpnRequest.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/sepay/ipn")
                        .header("X-Secret-Key", "valid_secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "notification_type": "ORDER_PAID",
                                    "order": {"order_invoice_number": "NONEXISTENT"}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }

    @Test
    void handleSepayIpn_AmountMismatch() throws Exception {
        // Given
        SepayIpnResponse response = SepayIpnResponse.amountMismatch();

        when(paymentService.handleSepayIpn(eq("valid_secret"), any(SepayIpnRequest.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/sepay/ipn")
                        .header("X-Secret-Key", "valid_secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "notification_type": "ORDER_PAID",
                                    "order": {
                                        "order_invoice_number": "PAY1234567890ABCD",
                                        "order_amount": 99999
                                    }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("AMOUNT_MISMATCH"));
    }

    // Payment History Tests (PRESERVED - Regression)
    @Test
    void getLearnerPayments_Success() throws Exception {
        // Given
        GetPaymentsResponse mockResponse = new GetPaymentsResponse(
                Collections.emptyList(),
                new GetPaymentsResponse.PaginationMeta(1, 10, 0, 0, false, false)
        );

        when(paymentService.getLearnerPayments(eq("user-123"), any()))
                .thenReturn(mockResponse);

        // When/Then
        mockMvc.perform(get("/api/payments/me")
                        .with(jwt().jwt(testJwt))
                        .param("page", "1")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.page").value(1))
                .andExpect(jsonPath("$.meta.limit").value(10));
    }

    @Test
    void getLearnerPayments_WithCustomPagination() throws Exception {
        // Given
        GetPaymentsResponse mockResponse = new GetPaymentsResponse(
                Collections.emptyList(),
                new GetPaymentsResponse.PaginationMeta(2, 20, 50, 3, true, true)
        );

        when(paymentService.getLearnerPayments(eq("user-123"), any()))
                .thenReturn(mockResponse);

        // When/Then
        mockMvc.perform(get("/api/payments/me")
                        .with(jwt().jwt(testJwt))
                        .param("page", "2")
                        .param("limit", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.page").value(2))
                .andExpect(jsonPath("$.meta.limit").value(20));
    }

    @Test
    void getLearnerPayments_Unauthorized() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/payments/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createSepayPayment_InvalidCourseId_Returns400() throws Exception {
        // Given
        CreateSepayPaymentRequest request = new CreateSepayPaymentRequest();
        request.setCourseId("invalid-course-id"); // Not a valid UUID format

        when(paymentService.createSepayPayment(eq("user-123"), any(CreateSepayPaymentRequest.class)))
                .thenThrow(new IllegalArgumentException("Invalid course ID"));

        // When/Then
        mockMvc.perform(post("/api/payments/sepay/create-payment")
                        .with(jwt().jwt(testJwt))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void confirmSimulationPayment_InvalidState_Returns400() throws Exception {
        // Given
        String paymentId = "payment-789";

        when(paymentService.confirmSimulationPayment(eq("user-123"), eq(paymentId)))
                .thenThrow(new com.springservice.payment.exception.InvalidPaymentStateException("Payment cannot be confirmed"));

        // When/Then
        mockMvc.perform(post("/api/payments/simulation/{paymentId}/confirm", paymentId)
                        .with(jwt().jwt(testJwt)))
                .andExpect(status().isBadRequest());
    }
}