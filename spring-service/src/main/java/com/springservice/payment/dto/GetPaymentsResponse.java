package com.springservice.payment.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GetPaymentsResponse {

    @JsonProperty("data")
    private List<LearnerPaymentItem> data;

    @JsonProperty("meta")
    private PaginationMeta meta;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaginationMeta {
        @JsonProperty("page")
        private int page;

        @JsonProperty("limit")
        private int limit;

        @JsonProperty("total")
        private long total;

        @JsonProperty("totalPages")
        private int totalPages;

        @JsonProperty("hasNextPage")
        private boolean hasNextPage;

        @JsonProperty("hasPreviousPage")
        private boolean hasPreviousPage;
    }
}