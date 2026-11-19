package com.springservice.payment.client;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "course-service", url = "${course-service.url:http://localhost:3000/api/v1}")
public interface CourseClient {

    /**
     * Get course price by ID using the public courses by-ids endpoint.
     * Returns a list with one course (or empty if not found).
     */
    @GetMapping("/courses/public/by-ids")
    List<CoursePriceResponse> getCoursesByIds(@RequestParam("ids") String courseIds);

    /**
     * Get course detail by ID using the public courses by-ids endpoint.
     * Returns a list with one course (or empty if not found).
     */
    @GetMapping("/courses/public/by-ids")
    List<CourseDetailResponse> getCourseDetailsByIds(@RequestParam("ids") String courseIds);

    record CoursePriceResponse(
            String id,
            BigDecimal price,
            String currency,
            String level,
            String status,
            Boolean isActive,
            String publishedAt
    ) {}

    record CourseDetailResponse(
            String id,
            String title,
            String slug,
            String shortDescription,
            String description,
            List<String> whatYouWillLearn,
            List<String> requirements,
            String thumbnailUrl,
            String level,
            BigDecimal price,
            String currency,
            Integer durationInMinutes,
            Boolean certificateEnabled,
            List<CategoryResponse> categories,
            List<InstructorResponse> instructors,
            String status,
            Boolean isActive,
            String publishedAt,
            String createdAt,
            String updatedAt,
            String deletedAt
    ) {}

    record CategoryResponse(String id, String name, String slug) {}

    record InstructorResponse(String id, String fullName) {}
}