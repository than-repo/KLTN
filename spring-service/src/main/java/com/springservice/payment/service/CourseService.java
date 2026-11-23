package com.springservice.payment.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.springservice.payment.client.CourseClient;
import com.springservice.payment.entity.PaymentMethod;
import com.springservice.payment.entity.PaymentStatus;
import com.springservice.payment.exception.CourseNotFoundException;
import com.springservice.payment.exception.CourseUnavailableException;
import com.springservice.payment.repository.PaymentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseService {

    private final PaymentRepository paymentRepository;
    private final CourseClient courseClient;

    public record CoursePrice(String id, BigDecimal price, String currency) {}

    @Transactional(readOnly = true)
    public CoursePrice getCoursePrice(String courseId) {
        try {
            CourseClient.CoursePriceResponseWrapper wrapper = courseClient.getCoursesByIds(courseId);

            if (wrapper == null || wrapper.data() == null || wrapper.data().isEmpty()) {
                throw new CourseNotFoundException(courseId);
            }

            CourseClient.CoursePriceResponse response = wrapper.data().get(0);

            if (response.id() == null) {
                throw new CourseNotFoundException(courseId);
            }

            if (!courseId.equals(response.id())) {
                throw new CourseUnavailableException(courseId, "Course ID mismatch");
            }

            // The public by-ids endpoint only returns published and active courses.
            // Its public DTO intentionally omits status/isActive/publishedAt, so null
            // here means not exposed, not unpublished. Reject explicit contradictory values.
            String status = response.status();
            if (status != null && !"PUBLISHED".equalsIgnoreCase(status)) {
                throw new CourseUnavailableException(courseId, "Course is not published");
            }
            if (Boolean.FALSE.equals(response.isActive())) {
                throw new CourseUnavailableException(courseId, "Course is not active");
            }

            BigDecimal price = response.price();
            if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
                throw new CourseUnavailableException(courseId, "Invalid course price");
            }

            String currency = response.currency() != null ? response.currency() : "VND";

            return new CoursePrice(response.id(), price, currency);

        } catch (feign.FeignException.NotFound e) {
            throw new CourseNotFoundException(courseId);
        } catch (feign.FeignException e) {
            log.error("Failed to fetch course price for courseId: {}", courseId, e);
            throw new CourseUnavailableException(courseId, "Course service unavailable");
        }
    }

    @Transactional(readOnly = true)
    public CourseClient.CourseDetailResponse getCourseDetail(String courseId) {
        try {
            CourseClient.CourseDetailResponseWrapper wrapper = courseClient.getCourseDetailsByIds(courseId);

            if (wrapper == null || wrapper.data() == null || wrapper.data().isEmpty()) {
                throw new CourseNotFoundException(courseId);
            }

            CourseClient.CourseDetailResponse response = wrapper.data().get(0);

            if (response.id() == null) {
                throw new CourseNotFoundException(courseId);
            }

            return response;

        } catch (feign.FeignException.NotFound e) {
            throw new CourseNotFoundException(courseId);
        } catch (feign.FeignException e) {
            log.error("Failed to fetch course detail for courseId: {}", courseId, e);
            throw new CourseUnavailableException(courseId, "Course service unavailable");
        }
    }

    // Check if user already has an active payment for this course
    // Runs without transaction to avoid rollback on missing course_id column
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public boolean hasActivePaymentForCourse(String userId, String courseId) {
        try {
            return paymentRepository.findFirstByUserIdAndCourseIdAndIsActiveTrueAndDeletedAtIsNullOrderByCreatedAtDesc(userId, courseId)
                    .filter(p -> p.getStatus() == PaymentStatus.PENDING || p.getStatus() == PaymentStatus.PAID)
                    .isPresent();
        } catch (Exception e) {
            // Database schema issue (missing course_id column) - log and allow payment to proceed
            log.warn("Could not check active payment for user {} course {}: {}", userId, courseId, e.getMessage());
            return false;
        }
    }
}