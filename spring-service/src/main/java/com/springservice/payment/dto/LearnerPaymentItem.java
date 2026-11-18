package com.springservice.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import com.springservice.payment.entity.PaymentMethod;
import com.springservice.payment.entity.PaymentStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearnerPaymentItem {

    @JsonProperty("id")
    private String id;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("paymentMethod")
    private PaymentMethod paymentMethod;

    @JsonProperty("status")
    private PaymentStatus status;

    @JsonProperty("paidAt")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime paidAt;

    @JsonProperty("createdAt")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonProperty("course")
    private CourseSummary course;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseSummary {
        @JsonProperty("id")
        private String id;

        @JsonProperty("title")
        private String title;

        @JsonProperty("slug")
        private String slug;

        @JsonProperty("thumbnailUrl")
        private String thumbnailUrl;
    }
}