package com.springservice.payment.dto;

import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SepayCheckoutForm {

    @JsonProperty("actionUrl")
    private String actionUrl;

    @JsonProperty("method")
    private String method = "POST";

    @JsonProperty("fields")
    private Map<String, String> fields;

    public static SepayCheckoutForm of(String actionUrl, Map<String, String> fields) {
        return SepayCheckoutForm.builder()
                .actionUrl(actionUrl)
                .method("POST")
                .fields(fields != null ? fields : new LinkedHashMap<>())
                .build();
    }
}