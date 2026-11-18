package com.springservice.payment.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.springservice.payment.entity.Enrollment;
import com.springservice.payment.entity.EnrollmentStatus;

public interface EnrollmentRepository extends JpaRepository<Enrollment, String> {

    Optional<Enrollment> findByUserIdAndCourseId(String userId, String courseId);

    Optional<Enrollment> findByPaymentId(String paymentId);

    List<Enrollment> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("SELECT e FROM Enrollment e WHERE e.userId = :userId AND e.courseId = :courseId " +
           "AND e.isActive = true AND e.deletedAt IS NULL " +
           "AND (e.status = :activeStatus OR e.status = :completedStatus)")
    Optional<Enrollment> findActiveEnrollmentByUserAndCourse(
            @Param("userId") String userId,
            @Param("courseId") String courseId,
            @Param("activeStatus") EnrollmentStatus activeStatus,
            @Param("completedStatus") EnrollmentStatus completedStatus);

    @Query("SELECT e FROM Enrollment e WHERE e.userId = :userId AND e.isActive = true AND e.deletedAt IS NULL " +
           "ORDER BY e.createdAt DESC")
    List<Enrollment> findActiveEnrollmentsByUserId(@Param("userId") String userId);

    boolean existsByUserIdAndCourseIdAndIsActiveTrueAndDeletedAtIsNull(String userId, String courseId);
}