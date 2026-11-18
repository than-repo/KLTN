package com.springservice.payment.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.springservice.payment.config.VnpayConfig;
import com.springservice.payment.dto.CreateVnpayPaymentUrlParams;

import static org.junit.jupiter.api.Assertions.*;

class VnpayServiceTest {

    private VnpayService vnpayService;

    private VnpayConfig vnpayConfig;

    private CreateVnpayPaymentUrlParams validParams;

    @BeforeEach
    void setUp() {
        vnpayConfig = new VnpayConfig();
        vnpayConfig.setTmnCode("TEST_TMN_CODE");
        vnpayConfig.setHashSecret("TEST_HASH_SECRET");
        vnpayConfig.setPaymentUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
        vnpayConfig.setReturnUrl("http://localhost:3001/payment/vnpay-return");

        vnpayService = new VnpayService(vnpayConfig);

        validParams = new CreateVnpayPaymentUrlParams(
                "PAY1234567890ABCD",
                BigDecimal.valueOf(100000),
                "Thanh toan khoa hoc",
                "127.0.0.1",
                "NCB",
                "vn"
        );
    }

    @Test
    void createPaymentUrl_GeneratesValidUrl() {
        // When
        String paymentUrl = vnpayService.createPaymentUrl(validParams);

        // Then
        assertNotNull(paymentUrl);
        assertTrue(paymentUrl.startsWith(vnpayConfig.getPaymentUrl()));
        assertTrue(paymentUrl.contains("vnp_TxnRef=PAY1234567890ABCD"));
        assertTrue(paymentUrl.contains("vnp_Amount=10000000")); // 100000 * 100
        assertTrue(paymentUrl.contains("vnp_SecureHash="));
        assertTrue(paymentUrl.contains("vnp_Version=2.1.0"));
        assertTrue(paymentUrl.contains("vnp_Command=pay"));
        assertTrue(paymentUrl.contains("vnp_TmnCode=TEST_TMN_CODE"));
        assertTrue(paymentUrl.contains("vnp_Locale=vn"));
        assertTrue(paymentUrl.contains("vnp_CurrCode=VND"));
        assertTrue(paymentUrl.contains("vnp_OrderInfo=Thanh+toan+khoa+hoc"));
        assertTrue(paymentUrl.contains("vnp_OrderType=other"));
        assertTrue(paymentUrl.contains("vnp_ReturnUrl="));
        assertTrue(paymentUrl.contains("vnp_IpAddr=127.0.0.1"));
        assertTrue(paymentUrl.contains("vnp_BankCode=NCB"));
    }

    @Test
    void createPaymentUrl_WithMinimalParams_GeneratesValidUrl() {
        // Given
        CreateVnpayPaymentUrlParams minimalParams = new CreateVnpayPaymentUrlParams(
                "PAY1234567890ABCD",
                BigDecimal.valueOf(50000),
                "Test order",
                "192.168.1.1",
                null,
                null
        );

        // When
        String paymentUrl = vnpayService.createPaymentUrl(minimalParams);

        // Then
        assertNotNull(paymentUrl);
        assertTrue(paymentUrl.contains("vnp_Amount=5000000")); // 50000 * 100
        assertTrue(paymentUrl.contains("vnp_Locale=vn")); // default locale
        assertFalse(paymentUrl.contains("vnp_BankCode")); // no bank code
    }

    @Test
    void verifyReturnUrl_ValidSignature_ReturnsTrue() {
        // Given
        String paymentUrl = vnpayService.createPaymentUrl(validParams);
        String queryString = paymentUrl.substring(paymentUrl.indexOf("?") + 1);
        Map<String, String> queryParams = parseQueryString(queryString);

        // When
        boolean isValid = vnpayService.verifyReturnUrl(queryParams);

        // Then
        assertTrue(isValid);
    }

    @Test
    void verifyReturnUrl_InvalidSignature_ReturnsFalse() {
        // Given
        Map<String, String> queryParams = new LinkedHashMap<>();
        queryParams.put("vnp_TxnRef", "PAY1234567890ABCD");
        queryParams.put("vnp_Amount", "10000000");
        queryParams.put("vnp_SecureHash", "invalid_hash");

        // When
        boolean isValid = vnpayService.verifyReturnUrl(queryParams);

        // Then
        assertFalse(isValid);
    }

    @Test
    void verifyReturnUrl_MissingSecureHash_ReturnsFalse() {
        // Given
        Map<String, String> queryParams = new LinkedHashMap<>();
        queryParams.put("vnp_TxnRef", "PAY1234567890ABCD");
        queryParams.put("vnp_Amount", "10000000");

        // When
        boolean isValid = vnpayService.verifyReturnUrl(queryParams);

        // Then
        assertFalse(isValid);
    }

    @Test
    void verifyReturnUrl_ModifiedAmount_ReturnsFalse() {
        // Given
        String paymentUrl = vnpayService.createPaymentUrl(validParams);
        String queryString = paymentUrl.substring(paymentUrl.indexOf("?") + 1);
        Map<String, String> queryParams = parseQueryString(queryString);

        // Tamper with amount
        queryParams.put("vnp_Amount", "9999999");

        // When
        boolean isValid = vnpayService.verifyReturnUrl(queryParams);

        // Then
        assertFalse(isValid);
    }

    @Test
    void createPaymentUrl_InvalidAmount_ThrowsException() {
        // Given
        CreateVnpayPaymentUrlParams params = new CreateVnpayPaymentUrlParams(
                "PAY1234567890ABCD",
                BigDecimal.ZERO,
                "Thanh toan khoa hoc",
                "127.0.0.1",
                null,
                "vn"
        );

        // When/Then
        assertThrows(IllegalArgumentException.class, () -> vnpayService.createPaymentUrl(params));
    }

    @Test
    void createPaymentUrl_NegativeAmount_ThrowsException() {
        // Given
        CreateVnpayPaymentUrlParams params = new CreateVnpayPaymentUrlParams(
                "PAY1234567890ABCD",
                BigDecimal.valueOf(-100),
                "Thanh toan khoa hoc",
                "127.0.0.1",
                null,
                "vn"
        );

        // When/Then
        assertThrows(IllegalArgumentException.class, () -> vnpayService.createPaymentUrl(params));
    }

    @Test
    void createPaymentUrl_DifferentLocales_GeneratesCorrectUrl() {
        // Given
        CreateVnpayPaymentUrlParams paramsEn = new CreateVnpayPaymentUrlParams(
                "PAY1234567890ABCD",
                BigDecimal.valueOf(100000),
                "Payment for course",
                "127.0.0.1",
                null,
                "en"
        );

        // When
        String paymentUrl = vnpayService.createPaymentUrl(paramsEn);

        // Then
        assertTrue(paymentUrl.contains("vnp_Locale=en"));
    }

    @Test
    void verifyReturnUrl_IgnoresSecureHashType() {
        // Given
        String paymentUrl = vnpayService.createPaymentUrl(validParams);
        String queryString = paymentUrl.substring(paymentUrl.indexOf("?") + 1);
        Map<String, String> queryParams = parseQueryString(queryString);

        // Add SecureHashType (should be ignored)
        queryParams.put("vnp_SecureHashType", "SHA512");

        // When
        boolean isValid = vnpayService.verifyReturnUrl(queryParams);

        // Then
        assertTrue(isValid);
    }

    @Test
    void createPaymentUrl_AmountMultipliedBy100() {
        // Given
        CreateVnpayPaymentUrlParams params = new CreateVnpayPaymentUrlParams(
                "PAY1234567890ABCD",
                BigDecimal.valueOf(12345),
                "Test",
                "127.0.0.1",
                null,
                "vn"
        );

        // When
        String paymentUrl = vnpayService.createPaymentUrl(params);

        // Then
        assertTrue(paymentUrl.contains("vnp_Amount=1234500")); // 12345 * 100
    }

    @Test
    void createPaymentUrl_GeneratesValidCreateDateAndExpireDate() {
        // Given
        LocalDateTime before = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        // When
        String paymentUrl = vnpayService.createPaymentUrl(validParams);

        // Then
        assertTrue(paymentUrl.contains("vnp_CreateDate="));
        assertTrue(paymentUrl.contains("vnp_ExpireDate="));

        String createDate = extractParam(paymentUrl, "vnp_CreateDate");
        String expireDate = extractParam(paymentUrl, "vnp_ExpireDate");

        assertNotNull(createDate);
        assertNotNull(expireDate);
        assertEquals(14, createDate.length()); // yyyyMMddHHmmss
        assertEquals(14, expireDate.length());

        // Expire date should be 15 minutes after create date
        LocalDateTime createDt = LocalDateTime.parse(createDate, java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        LocalDateTime expireDt = LocalDateTime.parse(expireDate, java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        assertEquals(15, java.time.Duration.between(createDt, expireDt).toMinutes());
    }

    private Map<String, String> parseQueryString(String queryString) {
        Map<String, String> params = new LinkedHashMap<>();
        String[] pairs = queryString.split("&");
        for (String pair : pairs) {
            String[] keyValue = pair.split("=", 2);
            if (keyValue.length == 2) {
                try {
                    params.put(keyValue[0], java.net.URLDecoder.decode(keyValue[1], "UTF-8"));
                } catch (Exception e) {
                    params.put(keyValue[0], keyValue[1]);
                }
            }
        }
        return params;
    }

    private String extractParam(String url, String paramName) {
        String prefix = paramName + "=";
        int start = url.indexOf(prefix);
        if (start == -1) return null;
        start += prefix.length();
        int end = url.indexOf("&", start);
        if (end == -1) end = url.length();
        return url.substring(start, end);
    }
}