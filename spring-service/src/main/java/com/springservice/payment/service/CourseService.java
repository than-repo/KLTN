package com.springservice.payment.service;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
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
            CourseClient.CoursePriceResponse response = courseClient.getCoursePrice(courseId);

            if (response == null || response.id() == null) {
                throw new CourseNotFoundException(courseId);
            }

            if (!response.isPublished()) {
                throw new CourseUnavailableException(courseId, "Course is not published");
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
            CourseClient.CourseDetailResponse response = courseClient.getCourseDetail(courseId);

            if (response == null || response.id() == null) {
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
    public boolean hasActivePaymentForCourse(String userId, String courseId) {
        return paymentRepository.findFirstByUserIdAndCourseIdAndIsActiveTrueAndDeletedAtIsNullOrderByCreatedAtDesc(userId, courseId)
                .filter(p -> p.getStatus() == PaymentStatus.PENDING || p.getStatus() == PaymentStatus.PAID)
                .isPresent();
    }
}