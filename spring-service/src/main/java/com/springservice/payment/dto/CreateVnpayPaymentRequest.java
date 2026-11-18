package com.springservice.payment.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateVnpayPaymentRequest {

    @NotNull
    @Size(min = 36, max = 36, message = "courseId must be a valid UUID")
    @JsonProperty("courseId")
    private String courseId;

    @JsonProperty("bankCode")
    private String bankCode;

    @JsonProperty("locale")
    private String locale;
}