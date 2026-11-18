package com.springservice.payment.service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;

import com.springservice.payment.config.VnpayConfig;
import com.springservice.payment.dto.CreateVnpayPaymentUrlParams;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class VnpayService {

    private final VnpayConfig vnpayConfig;

    private static final String HMAC_SHA512 = "HmacSHA512";
    private static final String VNP_VERSION = "2.1.0";
    private static final String VNP_COMMAND = "pay";
    private static final String VNP_ORDER_TYPE = "other";
    private static final String VNP_CURR_CODE = "VND";
    private static final int EXPIRE_MINUTES = 15;

    public String createPaymentUrl(CreateVnpayPaymentUrlParams params) {
        if (params.amount() == null || params.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Invalid VNPay amount");
        }

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDateTime expireTime = now.plusMinutes(EXPIRE_MINUTES);

        String createDate = formatVnpDate(now);
        String expireDate = formatVnpDate(expireTime);

        Map<String, String> vnpParams = new LinkedHashMap<>();
        vnpParams.put("vnp_Version", VNP_VERSION);
        vnpParams.put("vnp_Command", VNP_COMMAND);
        vnpParams.put("vnp_TmnCode", vnpayConfig.getTmnCode());
        vnpParams.put("vnp_Locale", params.locale() != null ? params.locale() : "vn");
        vnpParams.put("vnp_CurrCode", VNP_CURR_CODE);
        vnpParams.put("vnp_TxnRef", params.txnRef());
        vnpParams.put("vnp_OrderInfo", params.orderInfo());
        vnpParams.put("vnp_OrderType", VNP_ORDER_TYPE);
        // VNPay expects amount in smallest currency unit (VND * 100)
        vnpParams.put("vnp_Amount", params.amount().multiply(BigDecimal.valueOf(100)).toBigInteger().toString());
        vnpParams.put("vnp_ReturnUrl", vnpayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", params.ipAddr());
        vnpParams.put("vnp_CreateDate", createDate);
        vnpParams.put("vnp_ExpireDate", expireDate);

        if (params.bankCode() != null && !params.bankCode().trim().isEmpty()) {
            vnpParams.put("vnp_BankCode", params.bankCode().trim());
        }

        String signData = buildSortedQueryString(vnpParams);
        String secureHash = hmacSHA512(vnpayConfig.getHashSecret(), signData);

        vnpParams.put("vnp_SecureHash", secureHash);

        String queryString = buildQueryString(vnpParams);
        return vnpayConfig.getPaymentUrl() + "?" + queryString;
    }

    public boolean verifyReturnUrl(Map<String, String> query) {
        String secureHash = query.get("vnp_SecureHash");
        if (secureHash == null) {
            return false;
        }

        Map<String, String> copiedQuery = new TreeMap<>(query);
        copiedQuery.remove("vnp_SecureHash");
        copiedQuery.remove("vnp_SecureHashType");

        String signData = buildSortedQueryString(copiedQuery);
        String checkHash = hmacSHA512(vnpayConfig.getHashSecret(), signData);

        return secureHash.equalsIgnoreCase(checkHash);
    }

    private String buildSortedQueryString(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> entry : new TreeMap<>(params).entrySet()) {
            String value = entry.getValue();
            if (value == null || value.isEmpty()) {
                continue;
            }
            if (!first) {
                sb.append("&");
            }
            sb.append(entry.getKey()).append("=").append(urlEncode(value));
            first = false;
        }
        return sb.toString();
    }

    private String buildQueryString(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String value = entry.getValue();
            if (value == null || value.isEmpty()) {
                continue;
            }
            if (!first) {
                sb.append("&");
            }
            sb.append(entry.getKey()).append("=").append(urlEncode(value));
            first = false;
        }
        return sb.toString();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA512);
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), HMAC_SHA512);
            mac.init(secretKey);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Failed to generate HMAC SHA512", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private String formatVnpDate(LocalDateTime dateTime) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        return dateTime.format(formatter);
    }
}