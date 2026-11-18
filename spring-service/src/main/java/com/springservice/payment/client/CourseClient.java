package com.springservice.payment.client;

import java.math.BigDecimal;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "course-service", url = "${course-service.url:http://localhost:8081}")
public interface CourseClient {

    @GetMapping("/api/courses/{courseId}/price")
    CoursePriceResponse getCoursePrice(@PathVariable String courseId);

    @GetMapping("/api/courses/{courseId}")
    CourseDetailResponse getCourseDetail(@PathVariable String courseId);

    record CoursePriceResponse(String id, BigDecimal price, String currency, boolean isPublished) {}

    record CourseDetailResponse(
            String id,
            String title,
            String slug,
            String shortDescription,
            BigDecimal price,
            String currency,
            String level,
            String status,
            String thumbnailUrl,
            boolean isPublished
    ) {}
}