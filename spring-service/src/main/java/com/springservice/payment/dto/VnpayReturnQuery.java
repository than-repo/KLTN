package com.springservice.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VnpayReturnQuery {

    @JsonProperty("vnp_Amount")
    private String vnpAmount;

    @JsonProperty("vnp_BankCode")
    private String vnpBankCode;

    @JsonProperty("vnp_BankTranNo")
    private String vnpBankTranNo;

    @JsonProperty("vnp_CardType")
    private String vnpCardType;

    @JsonProperty("vnp_OrderInfo")
    private String vnpOrderInfo;

    @JsonProperty("vnp_PayDate")
    private String vnpPayDate;

    @JsonProperty("vnp_ResponseCode")
    private String vnpResponseCode;

    @JsonProperty("vnp_TmnCode")
    private String vnpTmnCode;

    @JsonProperty("vnp_TransactionNo")
    private String vnpTransactionNo;

    @JsonProperty("vnp_TransactionStatus")
    private String vnpTransactionStatus;

    @JsonProperty("vnp_TxnRef")
    private String vnpTxnRef;

    @JsonProperty("vnp_SecureHash")
    private String vnpSecureHash;

    @JsonProperty("vnp_SecureHashType")
    private String vnpSecureHashType;
}