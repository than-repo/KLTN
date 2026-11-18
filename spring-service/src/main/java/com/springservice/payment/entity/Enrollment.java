package com.springservice.payment.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "enrollments",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_enrollments_user_course", columnNames = { "user_id", "course_id" }),
                @UniqueConstraint(name = "uk_enrollments_payment_id", columnNames = { "payment_id" })
        },
        indexes = {
                @Index(name = "idx_enrollments_user_id", columnList = "user_id"),
                @Index(name = "idx_enrollments_course_id", columnList = "course_id"),
                @Index(name = "idx_enrollments_status", columnList = "status"),
                @Index(name = "idx_enrollments_payment_id", columnList = "payment_id")
        })
public class Enrollment {

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 36)
    private String id;

    @Column(name = "user_id", nullable = false, length = 191)
    private String userId;

    @Column(name = "course_id", nullable = false, length = 191)
    private String courseId;

    @Column(name = "payment_id", length = 36, unique = true)
    private String paymentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

    @Column(name = "progress_percentage", nullable = false)
    private Double progressPercentage = 0.0;

    @Column(name = "enrolled_at")
    private LocalDateTime enrolledAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    protected Enrollment() {
    }

    public Enrollment(String userId, String courseId, String paymentId, LocalDateTime enrolledAt) {
        this.userId = userId;
        this.courseId = courseId;
        this.paymentId = paymentId;
        this.enrolledAt = enrolledAt;
    }

    // Getters
    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getCourseId() {
        return courseId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public EnrollmentStatus getStatus() {
        return status;
    }

    public Double getProgressPercentage() {
        return progressPercentage;
    }

    public LocalDateTime getEnrolledAt() {
        return enrolledAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    // Setters
    public void setId(String id) {
        this.id = id;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public void setCourseId(String courseId) {
        this.courseId = courseId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public void setStatus(EnrollmentStatus status) {
        this.status = status;
    }

    public void setProgressPercentage(Double progressPercentage) {
        this.progressPercentage = progressPercentage;
    }

    public void setEnrolledAt(LocalDateTime enrolledAt) {
        this.enrolledAt = enrolledAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }
}