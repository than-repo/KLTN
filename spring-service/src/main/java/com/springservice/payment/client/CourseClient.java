package com.springservice.payment.client;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

@FeignClient(name = "course-service", url = "${course-service.url:http://localhost:3000/api/v1}")
public interface CourseClient {

    /**
     * Get course price by ID using the public courses by-ids endpoint.
     * Returns a wrapper with data array containing the course.
     */
    @GetMapping("/courses/public/by-ids")
    CoursePriceResponseWrapper getCoursesByIds(@RequestParam("ids") String courseIds);

    /**
     * Get course detail by ID using the public courses by-ids endpoint.
     * Returns a wrapper with data array containing the course.
     */
    @GetMapping("/courses/public/by-ids")
    CourseDetailResponseWrapper getCourseDetailsByIds(@RequestParam("ids") String courseIds);

    record CoursePriceResponseWrapper(
            @JsonProperty("success") Boolean success,
            @JsonProperty("statusCode") Integer statusCode,
            @JsonProperty("timestamp") String timestamp,
            @JsonProperty("path") String path,
            @JsonProperty("data") List<CoursePriceResponse> data
    ) {}

    record CourseDetailResponseWrapper(
            @JsonProperty("success") Boolean success,
            @JsonProperty("statusCode") Integer statusCode,
            @JsonProperty("timestamp") String timestamp,
            @JsonProperty("path") String path,
            @JsonProperty("data") List<CourseDetailResponse> data
    ) {}

    record CoursePriceResponse(
            @JsonProperty("id") String id,
            @JsonProperty("price") BigDecimal price,
            @JsonProperty("currency") String currency,
            @JsonProperty("level") String level,
            @JsonProperty("status") @JsonAlias({"status"}) String status,
            @JsonProperty("isActive") @JsonAlias({"isActive", "is_active"}) Boolean isActive,
            @JsonProperty("publishedAt") @JsonAlias({"publishedAt", "published_at"}) String publishedAt
    ) {}

    record CourseDetailResponse(
            @JsonProperty("id") String id,
            @JsonProperty("title") String title,
            @JsonProperty("slug") String slug,
            @JsonProperty("shortDescription") @JsonAlias({"shortDescription", "short_description"}) String shortDescription,
            @JsonProperty("description") String description,
            @JsonProperty("whatYouWillLearn") @JsonAlias({"whatYouWillLearn", "what_you_will_learn"}) List<String> whatYouWillLearn,
            @JsonProperty("requirements") List<String> requirements,
            @JsonProperty("thumbnailUrl") @JsonAlias({"thumbnailUrl", "thumbnail_url"}) String thumbnailUrl,
            @JsonProperty("level") String level,
            @JsonProperty("price") BigDecimal price,
            @JsonProperty("currency") String currency,
            @JsonProperty("durationInMinutes") @JsonAlias({"durationInMinutes", "duration_in_minutes"}) Integer durationInMinutes,
            @JsonProperty("certificateEnabled") @JsonAlias({"certificateEnabled", "certificate_enabled"}) Boolean certificateEnabled,
            @JsonProperty("categories") List<CategoryResponse> categories,
            @JsonProperty("instructors") List<InstructorResponse> instructors,
            @JsonProperty("status") String status,
            @JsonProperty("isActive") @JsonAlias({"isActive", "is_active"}) Boolean isActive,
            @JsonProperty("publishedAt") @JsonAlias({"publishedAt", "published_at"}) String publishedAt,
            @JsonProperty("createdAt") @JsonAlias({"createdAt", "created_at"}) String createdAt,
            @JsonProperty("updatedAt") @JsonAlias({"updatedAt", "updated_at"}) String updatedAt,
            @JsonProperty("deletedAt") @JsonAlias({"deletedAt", "deleted_at"}) String deletedAt
    ) {}

    record CategoryResponse(
            @JsonProperty("id") String id,
            @JsonProperty("name") String name,
            @JsonProperty("slug") String slug
    ) {}

    record InstructorResponse(
            @JsonProperty("id") String id,
            @JsonProperty("fullName") @JsonAlias({"fullName", "full_name"}) String fullName
    ) {}
}