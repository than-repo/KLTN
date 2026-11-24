package com.springservice.payment.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SepayIpnRequest {

    @JsonProperty("timestamp")
    private Long timestamp;

    @JsonProperty("notification_type")
    private String notificationType;

    @JsonProperty("order")
    private Order order;

    @JsonProperty("transaction")
    private Transaction transaction;

    @JsonProperty("customer")
    private Customer customer;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Order {

        @JsonProperty("id")
        private String id;

        @JsonProperty("order_id")
        private String orderId;

        @JsonProperty("order_status")
        private String orderStatus;

        @JsonProperty("order_currency")
        private String orderCurrency;

        @JsonProperty("order_amount")
        private BigDecimal orderAmount;

        @JsonProperty("order_invoice_number")
        private String orderInvoiceNumber;

        @JsonProperty("custom_data")
        private Object customData;

        @JsonProperty("user_agent")
        private String userAgent;

        @JsonProperty("ip_address")
        private String ipAddress;

        @JsonProperty("order_description")
        private String orderDescription;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Transaction {

        @JsonProperty("id")
        private String id;

        @JsonProperty("payment_method")
        private String paymentMethod;

        @JsonProperty("transaction_id")
        private String transactionId;

        @JsonProperty("transaction_type")
        private String transactionType;

        @JsonProperty("transaction_date")
        private String transactionDate;

        @JsonProperty("transaction_status")
        private String transactionStatus;

        @JsonProperty("transaction_amount")
        private BigDecimal transactionAmount;

        @JsonProperty("transaction_currency")
        private String transactionCurrency;

        @JsonProperty("authentication_status")
        private String authenticationStatus;

        @JsonProperty("card_number")
        private String cardNumber;

        @JsonProperty("card_holder_name")
        private String cardHolderName;

        @JsonProperty("card_expiry")
        private String cardExpiry;

        @JsonProperty("card_funding_method")
        private String cardFundingMethod;

        @JsonProperty("card_brand")
        private String cardBrand;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Customer {

        @JsonProperty("id")
        private String id;

        @JsonProperty("customer_id")
        private String customerId;
    }
}