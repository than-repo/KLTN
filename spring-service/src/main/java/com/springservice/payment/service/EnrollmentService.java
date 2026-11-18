package com.springservice.payment.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.springservice.payment.entity.Enrollment;
import com.springservice.payment.entity.EnrollmentStatus;
import com.springservice.payment.entity.Payment;
import com.springservice.payment.entity.PaymentStatus;
import com.springservice.payment.exception.EnrollmentAlreadyExistsException;
import com.springservice.payment.exception.EnrollmentNotFoundException;
import com.springservice.payment.repository.EnrollmentRepository;
import com.springservice.payment.repository.PaymentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final PaymentRepository paymentRepository;

    @Transactional
    public Enrollment activateEnrollmentForPayment(Payment payment, LocalDateTime enrolledAt) {
        // Check if enrollment already exists
        Optional<Enrollment> existingOpt = enrollmentRepository.findByUserIdAndCourseId(
                payment.getUserId(), payment.getCourseId());

        if (existingOpt.isPresent()) {
            Enrollment existing = existingOpt.get();

            // If already active/completed with a payment, update payment reference
            if (existing.getIsActive() && existing.getDeletedAt() == null &&
                    (existing.getStatus() == EnrollmentStatus.ACTIVE || existing.getStatus() == EnrollmentStatus.COMPLETED)) {

                if (existing.getPaymentId() == null) {
                    existing.setPaymentId(payment.getId());
                    return enrollmentRepository.save(existing);
                }
                return existing;
            }

            // Reactivate cancelled/expired enrollment
            if (!existing.getIsActive() || existing.getDeletedAt() != null ||
                    existing.getStatus() == EnrollmentStatus.CANCELLED || existing.getStatus() == EnrollmentStatus.EXPIRED) {

                existing.setStatus(EnrollmentStatus.ACTIVE);
                existing.setPaymentId(payment.getId());
                existing.setIsActive(true);
                existing.setDeletedAt(null);
                existing.setCompletedAt(null);
                existing.setEnrolledAt(existing.getEnrolledAt() != null ? existing.getEnrolledAt() : enrolledAt);
                return enrollmentRepository.save(existing);
            }
        }

        // Create new enrollment
        Enrollment enrollment = new Enrollment(
                payment.getUserId(),
                payment.getCourseId(),
                payment.getId(),
                enrolledAt
        );
        enrollment.setId(UUID.randomUUID().toString());
        return enrollmentRepository.save(enrollment);
    }

    @Transactional(readOnly = true)
    public Optional<Enrollment> getActiveEnrollment(String userId, String courseId) {
        return enrollmentRepository.findActiveEnrollmentByUserAndCourse(
                userId, courseId, EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED);
    }

    @Transactional(readOnly = true)
    public List<Enrollment> getUserEnrollments(String userId) {
        return enrollmentRepository.findActiveEnrollmentsByUserId(userId);
    }

    @Transactional(readOnly = true)
    public boolean isUserEnrolledInCourse(String userId, String courseId) {
        return enrollmentRepository.existsByUserIdAndCourseIdAndIsActiveTrueAndDeletedAtIsNull(userId, courseId);
    }

    @Transactional
    public Enrollment cancelEnrollment(String userId, String courseId) {
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new EnrollmentNotFoundException(userId, courseId));

        if (enrollment.getStatus() == EnrollmentStatus.CANCELLED) {
            return enrollment;
        }

        enrollment.setStatus(EnrollmentStatus.CANCELLED);
        enrollment.setIsActive(false);
        enrollment.setDeletedAt(LocalDateTime.now());
        return enrollmentRepository.save(enrollment);
    }

    @Transactional
    public Enrollment completeEnrollment(String userId, String courseId) {
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new EnrollmentNotFoundException(userId, courseId));

        if (enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
            return enrollment;
        }

        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        enrollment.setCompletedAt(LocalDateTime.now());
        enrollment.setProgressPercentage(100.0);
        return enrollmentRepository.save(enrollment);
    }

    @Transactional
    public Enrollment updateProgress(String userId, String courseId, Double progress) {
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new EnrollmentNotFoundException(userId, courseId));

        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
            throw new IllegalStateException("Cannot update progress for non-active enrollment");
        }

        enrollment.setProgressPercentage(Math.max(0, Math.min(100, progress)));

        if (enrollment.getProgressPercentage() >= 100.0) {
            enrollment.setStatus(EnrollmentStatus.COMPLETED);
            enrollment.setCompletedAt(LocalDateTime.now());
        }

        return enrollmentRepository.save(enrollment);
    }
}