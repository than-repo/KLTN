package com.springservice.payment.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.springservice.payment.config.SepayConfig;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SepayGatewayClientTest {

    private static final String API_BASE_URL = "https://pgapi-sandbox.sepay.vn";
    private static final String INVOICE_NUMBER = "PAY123";
    private static final String BASIC_AUTH = "Basic " + Base64.getEncoder().encodeToString(
            "merchant:merchant-secret".getBytes(StandardCharsets.UTF_8));

    private SepayGatewayClient gatewayClient;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        SepayConfig config = new SepayConfig();
        config.setApiBaseUrl(API_BASE_URL);
        config.setMerchantId("merchant");
        config.setMerchantSecretKey("merchant-secret");

        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        gatewayClient = new SepayGatewayClient(config, builder.build());
    }

    @Test
    void cancelsAnUncapturedOrderUsingMerchantBasicAuth() {
        server.expect(requestTo(API_BASE_URL + "/v1/order/detail/" + INVOICE_NUMBER))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BASIC_AUTH))
                .andRespond(withSuccess("""
                        {"data":{"order_status":"AUTHENTICATION_NOT_NEEDED"}}
                        """, org.springframework.http.MediaType.APPLICATION_JSON));
        server.expect(requestTo(API_BASE_URL + "/v1/order/cancel"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BASIC_AUTH))
                .andExpect(content().json("""
                        {"order_invoice_number":"PAY123"}
                        """))
                .andRespond(withSuccess());

        assertDoesNotThrow(() -> gatewayClient.cancelOrder(INVOICE_NUMBER));
        server.verify();
    }

    @Test
    void refusesToCancelAnOrderThatWasAlreadyCaptured() {
        server.expect(requestTo(API_BASE_URL + "/v1/order/detail/" + INVOICE_NUMBER))
                .andRespond(withSuccess("""
                        {"data":{"order_status":"CAPTURED"}}
                        """, org.springframework.http.MediaType.APPLICATION_JSON));

        assertThrows(
                com.springservice.payment.exception.InvalidPaymentStateException.class,
                () -> gatewayClient.cancelOrder(INVOICE_NUMBER));
        server.verify();
    }

    @Test
    void treatsAnOrderAlreadyCancelledAtSePayAsCancelled() {
        server.expect(requestTo(API_BASE_URL + "/v1/order/detail/" + INVOICE_NUMBER))
                .andRespond(withSuccess("""
                        {"data":{"order_status":"CANCELLED"}}
                        """, org.springframework.http.MediaType.APPLICATION_JSON));

        assertDoesNotThrow(() -> gatewayClient.cancelOrder(INVOICE_NUMBER));
        server.verify();
    }

    @Test
    void allowsLocalCancellationWhenNoProviderOrderWasCreated() {
        server.expect(requestTo(API_BASE_URL + "/v1/order/detail/" + INVOICE_NUMBER))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertDoesNotThrow(() -> gatewayClient.cancelOrder(INVOICE_NUMBER));
        server.verify();
    }

    @Test
    void acceptsAConcurrentRemoteCancellationOnlyAfterConfirmingFinalStatus() {
        server.expect(requestTo(API_BASE_URL + "/v1/order/detail/" + INVOICE_NUMBER))
                .andRespond(withSuccess("""
                        {"data":{"order_status":"AUTHENTICATION_NOT_NEEDED"}}
                        """, org.springframework.http.MediaType.APPLICATION_JSON));
        server.expect(requestTo(API_BASE_URL + "/v1/order/cancel"))
                .andRespond(withStatus(HttpStatus.CONFLICT));
        server.expect(requestTo(API_BASE_URL + "/v1/order/detail/" + INVOICE_NUMBER))
                .andRespond(withSuccess("""
                        {"data":{"order_status":"CANCELLED"}}
                        """, org.springframework.http.MediaType.APPLICATION_JSON));

        assertDoesNotThrow(() -> gatewayClient.cancelOrder(INVOICE_NUMBER));
        server.verify();
    }
}
