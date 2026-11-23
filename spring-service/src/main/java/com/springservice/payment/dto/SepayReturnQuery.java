package com.springservice.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SepayReturnQuery {

    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("order_invoice_number")
    private String orderInvoiceNumber;

    @JsonProperty("transaction_id")
    private String transactionId;

    @JsonProperty("status")
    private String status;
}