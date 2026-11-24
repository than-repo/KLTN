package com.springservice.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "sepay")
public class SepayConfig {

    private String environment = "sandbox";
    private String merchantId;
    private String merchantSecretKey;
    private String ipnSecretKey;
    private String checkoutUrl = "https://pay-sandbox.sepay.vn/v1/checkout/init";
    private String apiBaseUrl = "https://pgapi-sandbox.sepay.vn";
    private String successUrl;
    private String errorUrl;
    private String cancelUrl;
    private String ipnUrl;

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getMerchantId() {
        return merchantId;
    }

    public void setMerchantId(String merchantId) {
        this.merchantId = merchantId;
    }

    public String getMerchantSecretKey() {
        return merchantSecretKey;
    }

    public void setMerchantSecretKey(String merchantSecretKey) {
        this.merchantSecretKey = merchantSecretKey;
    }

    public String getIpnSecretKey() {
        return ipnSecretKey;
    }

    public void setIpnSecretKey(String ipnSecretKey) {
        this.ipnSecretKey = ipnSecretKey;
    }

    public String getCheckoutUrl() {
        return checkoutUrl;
    }

    public void setCheckoutUrl(String checkoutUrl) {
        this.checkoutUrl = checkoutUrl;
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public void setApiBaseUrl(String apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }

    public String getSuccessUrl() {
        return successUrl;
    }

    public void setSuccessUrl(String successUrl) {
        this.successUrl = successUrl;
    }

    public String getErrorUrl() {
        return errorUrl;
    }

    public void setErrorUrl(String errorUrl) {
        this.errorUrl = errorUrl;
    }

    public String getCancelUrl() {
        return cancelUrl;
    }

    public void setCancelUrl(String cancelUrl) {
        this.cancelUrl = cancelUrl;
    }

    public String getIpnUrl() {
        return ipnUrl;
    }

    public void setIpnUrl(String ipnUrl) {
        this.ipnUrl = ipnUrl;
    }

    public boolean isSandbox() {
        return "sandbox".equalsIgnoreCase(environment) || "test".equalsIgnoreCase(environment);
    }
}