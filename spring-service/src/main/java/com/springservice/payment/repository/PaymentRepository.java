package com.springservice.payment.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.springservice.payment.entity.Payment;
import com.springservice.payment.entity.PaymentMethod;
import com.springservice.payment.entity.PaymentStatus;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByTxnRef(String txnRef);

    Optional<Payment> findByIdAndUserIdAndPaymentMethodAndProvider(String id, String userId, PaymentMethod paymentMethod, String provider);

    List<Payment> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("SELECT p FROM Payment p WHERE p.userId = :userId ORDER BY p.createdAt DESC")
    List<Payment> findByUserIdOrderByCreatedAtDesc(
            @Param("userId") String userId,
            org.springframework.data.domain.Pageable pageable);

    long countByUserId(String userId);

    @Modifying
    @Transactional
    @Query("UPDATE Payment p SET p.status = :status, p.providerPaymentId = :providerPaymentId, " +
           "p.providerMetadata = :providerMetadata, p.paidAt = :paidAt, p.isActive = :isActive, p.deletedAt = :deletedAt " +
           "WHERE p.id = :paymentId")
    int updatePayment(
            @Param("paymentId") String paymentId,
            @Param("status") PaymentStatus status,
            @Param("providerPaymentId") String providerPaymentId,
            @Param("providerMetadata") String providerMetadata,
            @Param("paidAt") java.time.LocalDateTime paidAt,
            @Param("isActive") Boolean isActive,
            @Param("deletedAt") java.time.LocalDateTime deletedAt);

    @Modifying
    @Transactional
    @Query("UPDATE Payment p SET p.status = :status, p.providerPaymentId = :providerPaymentId, " +
           "p.providerMetadata = :providerMetadata, p.paidAt = null " +
           "WHERE p.id = :paymentId AND p.status = :pendingStatus")
    int markPendingPaymentFailed(
            @Param("paymentId") String paymentId,
            @Param("status") PaymentStatus status,
            @Param("providerPaymentId") String providerPaymentId,
            @Param("providerMetadata") String providerMetadata,
            @Param("pendingStatus") PaymentStatus pendingStatus);

    // Atomic conditional update: ONLY transitions PENDING -> PAID
    // Used for idempotent IPN processing to prevent duplicate settlements
    @Modifying
    @Transactional
    @Query("UPDATE Payment p SET p.status = :status, p.providerPaymentId = :providerPaymentId, " +
           "p.providerMetadata = :providerMetadata, p.paidAt = :paidAt, p.isActive = :isActive " +
           "WHERE p.id = :paymentId AND p.status = :expectedStatus")
    int settlePaymentIfPending(
            @Param("paymentId") String paymentId,
            @Param("status") PaymentStatus status,
            @Param("providerPaymentId") String providerPaymentId,
            @Param("providerMetadata") String providerMetadata,
            @Param("paidAt") java.time.LocalDateTime paidAt,
            @Param("isActive") Boolean isActive,
            @Param("expectedStatus") PaymentStatus expectedStatus);

    Optional<Payment> findFirstByUserIdAndCourseIdAndIsActiveTrueAndDeletedAtIsNullAndStatusInOrderByCreatedAtDesc(
            String userId,
            String courseId,
            List<PaymentStatus> statuses);
}