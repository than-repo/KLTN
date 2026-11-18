package com.springservice.payment.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "payments",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_payments_txn_ref",
                columnNames = { "txn_ref" }),
        indexes = {
                @Index(name = "idx_payments_user_id", columnList = "user_id"),
                @Index(name = "idx_payments_course_id", columnList = "course_id"),
                @Index(name = "idx_payments_user_course", columnList = "user_id, course_id"),
                @Index(name = "idx_payments_status", columnList = "status")
        })
public class Payment {

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 36)
    private String id;

    @Column(name = "user_id", nullable = false, length = 191)
    private String userId;

    @Column(name = "course_id", nullable = false, length = 191)
    private String courseId;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "VND";

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod = PaymentMethod.VNPAY;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "provider", nullable = false, length = 50)
    private String provider = "VNPAY";

    @Column(name = "txn_ref", length = 100, unique = true)
    private String txnRef;

    @Column(name = "provider_payment_id", length = 100)
    private String providerPaymentId;

    @Column(name = "provider_metadata", columnDefinition = "TEXT")
    private String providerMetadata;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

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

    protected Payment() {
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
        if (currency == null) {
            currency = "VND";
        }
        if (paymentMethod == null) {
            paymentMethod = PaymentMethod.VNPAY;
        }
        if (status == null) {
            status = PaymentStatus.PENDING;
        }
        if (provider == null) {
            provider = "VNPAY";
        }
        if (isActive == null) {
            isActive = true;
        }
    }

    // Constructor for creating new payments
    public Payment(String userId, String courseId, BigDecimal amount, PaymentMethod paymentMethod, String provider, String txnRef) {
        this.userId = userId;
        this.courseId = courseId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.provider = provider;
        this.txnRef = txnRef;
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

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public String getProvider() {
        return provider;
    }

    public String getTxnRef() {
        return txnRef;
    }

    public String getProviderPaymentId() {
        return providerPaymentId;
    }

    public String getProviderMetadata() {
        return providerMetadata;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
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
    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public void setProviderPaymentId(String providerPaymentId) {
        this.providerPaymentId = providerPaymentId;
    }

    public void setProviderMetadata(String providerMetadata) {
        this.providerMetadata = providerMetadata;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public void setTxnRef(String txnRef) {
        this.txnRef = txnRef;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public void setCourseId(String courseId) {
        this.courseId = courseId;
    }

    // For testing purposes
    public void setId(String id) {
        this.id = id;
    }
}