package com.springservice.payment.controller;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

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
import com.springservice.payment.dto.CreateSimulationPaymentRequest;
import com.springservice.payment.dto.CreateVnpayPaymentRequest;
import com.springservice.payment.dto.CreateVnpayPaymentResponse;
import com.springservice.payment.dto.GetPaymentsResponse;
import com.springservice.payment.dto.SimulationPaymentResponse;
import com.springservice.payment.dto.VnpayIpnResponse;
import com.springservice.payment.dto.VnpayReturnQuery;
import com.springservice.payment.dto.VnpayReturnResponse;
import com.springservice.payment.entity.Payment;
import com.springservice.payment.entity.PaymentMethod;
import com.springservice.payment.entity.PaymentStatus;
import com.springservice.payment.client.CourseClient;
import com.springservice.payment.repository.PaymentRepository;
import com.springservice.payment.repository.EnrollmentRepository;
import com.springservice.wishlist.repository.WishlistRepository;
import com.springservice.payment.service.PaymentService;
import com.springservice.payment.service.VnpayService;

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
                            .requestMatchers("/api/payments/vnpay/return").permitAll()
                            .requestMatchers("/api/payments/vnpay/ipn").permitAll()
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
    private VnpayService vnpayService;

    @MockitoBean
    private CourseClient courseClient;

    private Jwt testJwt = TestConfig.TEST_JWT;

    @Test
    void createVnpayPayment_Success() throws Exception {
        // Given
                CreateVnpayPaymentRequest request = new CreateVnpayPaymentRequest();
        request.setCourseId("course-456");
        request.setBankCode("NCB");
        request.setLocale("vn");

        CreateVnpayPaymentResponse response = new CreateVnpayPaymentResponse(
                "payment-789",
                "PAY1234567890ABCD",
                BigDecimal.valueOf(100000),
                "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=PAY1234567890ABCD..."
        );

        when(paymentService.createVnpayPayment(eq("user-123"), any(CreateVnpayPaymentRequest.class), anyString()))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/vnpay")
                        .with(jwt().jwt(testJwt))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentId").value("payment-789"))
                .andExpect(jsonPath("$.txnRef").value("PAY1234567890ABCD"))
                .andExpect(jsonPath("$.amount").value(100000))
                .andExpect(jsonPath("$.paymentUrl").value(containsString("vnpayment.vn")));
    }

    @Test
    void createVnpayPayment_Unauthorized() throws Exception {
        // Given
        CreateVnpayPaymentRequest request = new CreateVnpayPaymentRequest();
        request.setCourseId("course-456");

        // When/Then
        mockMvc.perform(post("/api/payments/vnpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createSimulationPayment_Success() throws Exception {
        // Given
                CreateSimulationPaymentRequest request = new CreateSimulationPaymentRequest();
        request.setCourseId("course-456");

        SimulationPaymentResponse response = new SimulationPaymentResponse("pending", null);

        when(paymentService.createSimulationPayment(eq("user-123"), any(CreateSimulationPaymentRequest.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/simulation")
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

    @Test
    void handleVnpayReturn_Success() throws Exception {
        // Given
        VnpayReturnResponse response = new VnpayReturnResponse("success", null);

        when(paymentService.handleVnpayReturn(any(VnpayReturnQuery.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(get("/api/payments/vnpay/return")
                        .param("vnp_TxnRef", "PAY1234567890ABCD")
                        .param("vnp_ResponseCode", "00")
                        .param("vnp_TransactionStatus", "00")
                        .param("vnp_SecureHash", "valid_hash"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));
    }

    @Test
    void handleVnpayReturn_AlreadyPaid() throws Exception {
        // Given
        VnpayReturnResponse response = new VnpayReturnResponse("already_paid", null);

        when(paymentService.handleVnpayReturn(any(VnpayReturnQuery.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(get("/api/payments/vnpay/return")
                        .param("vnp_TxnRef", "PAY1234567890ABCD")
                        .param("vnp_ResponseCode", "00")
                        .param("vnp_TransactionStatus", "00")
                        .param("vnp_SecureHash", "valid_hash"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("already_paid"));
    }

    @Test
    void handleVnpayIpn_Success() throws Exception {
        // Given
        VnpayIpnResponse response = new VnpayIpnResponse("00", "Success");

        when(paymentService.handleVnpayIpn(any(VnpayReturnQuery.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/vnpay/ipn")
                        .param("vnp_TxnRef", "PAY1234567890ABCD")
                        .param("vnp_ResponseCode", "00")
                        .param("vnp_TransactionStatus", "00")
                        .param("vnp_Amount", "10000000")
                        .param("vnp_TransactionNo", "12345678"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value("00"))
                .andExpect(jsonPath("$.Message").value("Success"));
    }

    @Test
    void handleVnpayIpn_ChecksumFailed() throws Exception {
        // Given
        VnpayIpnResponse response = new VnpayIpnResponse("97", "Checksum failed");

        when(paymentService.handleVnpayIpn(any(VnpayReturnQuery.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/vnpay/ipn")
                        .param("vnp_TxnRef", "PAY1234567890ABCD")
                        .param("vnp_ResponseCode", "00")
                        .param("vnp_SecureHash", "invalid_hash"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value("97"))
                .andExpect(jsonPath("$.Message").value("Checksum failed"));
    }

    @Test
    void handleVnpayIpn_OrderNotFound() throws Exception {
        // Given
        VnpayIpnResponse response = new VnpayIpnResponse("01", "Order not found");

        when(paymentService.handleVnpayIpn(any(VnpayReturnQuery.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/vnpay/ipn")
                        .param("vnp_TxnRef", "NONEXISTENT")
                        .param("vnp_ResponseCode", "00")
                        .param("vnp_Amount", "10000000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value("01"))
                .andExpect(jsonPath("$.Message").value("Order not found"));
    }

    @Test
    void handleVnpayIpn_AmountInvalid() throws Exception {
        // Given
        VnpayIpnResponse response = new VnpayIpnResponse("04", "Amount invalid");

        when(paymentService.handleVnpayIpn(any(VnpayReturnQuery.class)))
                .thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/payments/vnpay/ipn")
                        .param("vnp_TxnRef", "PAY1234567890ABCD")
                        .param("vnp_ResponseCode", "00")
                        .param("vnp_Amount", "9999999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value("04"))
                .andExpect(jsonPath("$.Message").value("Amount invalid"));
    }

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
        mockMvc.perform(get("/api/payments")
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
        mockMvc.perform(get("/api/payments")
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
        mockMvc.perform(get("/api/payments"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createVnpayPayment_InvalidCourseId_Returns400() throws Exception {
        // Given
                CreateVnpayPaymentRequest request = new CreateVnpayPaymentRequest();
        request.setCourseId("invalid-course-id"); // Not a valid UUID format

        when(paymentService.createVnpayPayment(eq("user-123"), any(CreateVnpayPaymentRequest.class), anyString()))
                .thenThrow(new IllegalArgumentException("Invalid course ID"));

        // When/Then
        mockMvc.perform(post("/api/payments/vnpay")
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