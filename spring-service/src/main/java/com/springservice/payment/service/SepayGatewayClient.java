package com.springservice.payment.service;

import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.springservice.payment.config.SepayConfig;
import com.springservice.payment.exception.InvalidPaymentStateException;

@Component
public class SepayGatewayClient {

    private final SepayConfig sepayConfig;
    private final RestClient restClient;

    @Autowired
    public SepayGatewayClient(SepayConfig sepayConfig) {
        this.sepayConfig = sepayConfig;

        JdkClientHttpRequestFactory requestFactory =
                new JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(5))
                        .build());
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    SepayGatewayClient(SepayConfig sepayConfig, RestClient restClient) {
        this.sepayConfig = sepayConfig;
        this.restClient = restClient;
    }

    public void cancelOrder(String invoiceNumber) {
        String orderStatus = getOrderStatus(invoiceNumber);
        if (orderStatus == null || isCancelled(orderStatus)) {
            return;
        }
        if ("CAPTURED".equalsIgnoreCase(orderStatus)) {
            throw new InvalidPaymentStateException(
                    "SePay has already captured this payment; it cannot be replaced.");
        }

        try {
            restClient.post()
                    .uri(sepayConfig.getApiBaseUrl() + "/v1/order/cancel")
                    .headers(headers -> headers.setBasicAuth(
                            requireConfig(sepayConfig.getMerchantId(), "merchant ID"),
                            requireConfig(sepayConfig.getMerchantSecretKey(), "merchant secret key")))
                    .body(Map.of("order_invoice_number", invoiceNumber))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            String latestStatus = getOrderStatus(invoiceNumber);
            if (latestStatus == null || isCancelled(latestStatus)) {
                return;
            }
            if ("CAPTURED".equalsIgnoreCase(latestStatus)) {
                throw new InvalidPaymentStateException(
                        "SePay has already captured this payment; it cannot be replaced.");
            }
            throw new SepayGatewayException("SePay could not cancel the pending order.", exception);
        }
    }

    private String getOrderStatus(String invoiceNumber) {
        var uri = UriComponentsBuilder.fromUriString(sepayConfig.getApiBaseUrl())
                .pathSegment("v1", "order", "detail", invoiceNumber)
                .build()
                .toUri();

        try {
            OrderDetailResponse response = restClient.get()
                    .uri(uri)
                    .headers(headers -> headers.setBasicAuth(
                            requireConfig(sepayConfig.getMerchantId(), "merchant ID"),
                            requireConfig(sepayConfig.getMerchantSecretKey(), "merchant secret key")))
                    .retrieve()
                    .body(OrderDetailResponse.class);

            if (response == null || response.data() == null || response.data().orderStatus() == null) {
                throw new SepayGatewayException("SePay returned an invalid order-status response.");
            }
            return response.data().orderStatus();
        } catch (HttpClientErrorException.NotFound exception) {
            return null;
        } catch (RestClientException exception) {
            throw new SepayGatewayException("SePay could not verify the order status.", exception);
        }
    }

    private boolean isCancelled(String orderStatus) {
        return "CANCELLED".equalsIgnoreCase(orderStatus) || "CANCELED".equalsIgnoreCase(orderStatus);
    }

    private String requireConfig(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("SePay " + name + " is not configured");
        }
        return value;
    }

    private record OrderDetailResponse(@JsonProperty("data") OrderDetail data) {
    }

    private record OrderDetail(@JsonProperty("order_status") String orderStatus) {
    }
}
