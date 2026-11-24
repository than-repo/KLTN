package com.springservice.payment.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.springservice.payment.dto.CreateSepayPaymentRequest;
import com.springservice.payment.dto.CreateSepayPaymentResponse;
import com.springservice.payment.dto.CreateSimulationPaymentRequest;
import com.springservice.payment.dto.GetPaymentsQuery;
import com.springservice.payment.dto.GetPaymentsResponse;
import com.springservice.payment.dto.LearnerPaymentItem;
import com.springservice.payment.dto.PaymentResponseDto;
import com.springservice.payment.dto.SepayCheckoutForm;
import com.springservice.payment.dto.SepayIpnRequest;
import com.springservice.payment.dto.SepayIpnResponse;
import com.springservice.payment.dto.SepayPendingPaymentResponse;
import com.springservice.payment.dto.SepayReturnQuery;
import com.springservice.payment.dto.SepayReturnResponse;
import com.springservice.payment.dto.SimulationPaymentResponse;
import com.springservice.payment.entity.Enrollment;
import com.springservice.payment.entity.Payment;
import com.springservice.payment.entity.PaymentMethod;
import com.springservice.payment.entity.PaymentStatus;
import com.springservice.payment.exception.InvalidPaymentStateException;
import com.springservice.payment.exception.CourseNotFoundException;
import com.springservice.payment.exception.CourseUnavailableException;
import com.springservice.payment.exception.InvalidPaymentStateException;
import com.springservice.payment.exception.PaymentNotFoundException;
import com.springservice.payment.exception.SepaySignatureException;
import com.springservice.payment.repository.PaymentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final SepayService sepayService;
    private final SepayGatewayClient sepayGatewayClient;
    private final CourseService courseService;
    private final EnrollmentService enrollmentService;

    private static final int DEFAULT_PAYMENT_LIMIT = 10;
    private static final int MAX_PAYMENT_LIMIT = 50;

    // SePay Payment
    public CreateSepayPaymentResponse createSepayPayment(String userId, CreateSepayPaymentRequest request) {
        CourseService.CoursePrice course = courseService.getCoursePrice(request.getCourseId());

        if (course == null) {
            throw new CourseNotFoundException(request.getCourseId());
        }

        BigDecimal amount = course.price();
        Integer amountInt = validateSepayAmount(amount);

        // Check if user already has an active payment for this course
        if (courseService.hasActivePaymentForCourse(userId, request.getCourseId())) {
            throw new IllegalStateException("User already has an active payment for this course");
        }

        String txnRef = generateTxnRef("PAY");

        Payment payment = new Payment(userId, request.getCourseId(), amountInt, PaymentMethod.SEPAY, "SEPAY", txnRef);
        payment = paymentRepository.save(payment);

        SepayCheckoutForm checkoutForm = sepayService.createCheckoutForm(payment);

        return new CreateSepayPaymentResponse(payment.getId(), payment.getTxnRef(), amount, checkoutForm);
    }

    public Optional<SepayPendingPaymentResponse> getPendingSepayPayment(String userId, String courseId) {
        return paymentRepository
                .findFirstByUserIdAndCourseIdAndPaymentMethodAndProviderAndIsActiveTrueAndDeletedAtIsNullAndStatusOrderByCreatedAtDesc(
                        userId, courseId, PaymentMethod.SEPAY, "SEPAY", PaymentStatus.PENDING)
                .map(payment -> new SepayPendingPaymentResponse(
                        payment.getId(), payment.getTxnRef(), BigDecimal.valueOf(payment.getAmount())));
    }

    public CreateSepayPaymentResponse replacePendingSepayPayment(String userId, String paymentId) {
        Payment payment = paymentRepository
                .findByIdAndUserIdAndPaymentMethodAndProvider(
                        paymentId, userId, PaymentMethod.SEPAY, "SEPAY")
                .orElseThrow(() -> new PaymentNotFoundException(paymentId));

        if (payment.getStatus() != PaymentStatus.PENDING ||
                !Boolean.TRUE.equals(payment.getIsActive()) ||
                payment.getDeletedAt() != null) {
            throw new InvalidPaymentStateException("Only an active pending SePay payment can be replaced.");
        }

        CourseService.CoursePrice course = courseService.getCoursePrice(payment.getCourseId());
        if (course == null) {
            throw new CourseNotFoundException(payment.getCourseId());
        }
        BigDecimal amount = course.price();
        Integer amountInt = validateSepayAmount(amount);

        sepayGatewayClient.cancelOrder(payment.getTxnRef());

        int cancelled = paymentRepository.cancelPendingPayment(
                payment.getId(), PaymentStatus.CANCELLED, PaymentStatus.PENDING);
        if (cancelled == 0) {
            Payment current = paymentRepository.findById(payment.getId())
                    .orElseThrow(() -> new PaymentNotFoundException(paymentId));
            if (current.getStatus() == PaymentStatus.PAID) {
                throw new InvalidPaymentStateException(
                        "The payment completed while cancellation was in progress; no replacement was created.");
            }
            throw new InvalidPaymentStateException(
                    "The payment changed while cancellation was in progress; refresh and try again.");
        }

        if (courseService.hasActivePaymentForCourse(userId, payment.getCourseId())) {
            throw new IllegalStateException(
                    "Another active payment exists for this course; no replacement was created.");
        }

        String txnRef = generateTxnRef("PAY");
        Payment replacement = new Payment(
                userId, payment.getCourseId(), amountInt, PaymentMethod.SEPAY, "SEPAY", txnRef);
        replacement = paymentRepository.save(replacement);
        SepayCheckoutForm checkoutForm = sepayService.createCheckoutForm(replacement);

        return new CreateSepayPaymentResponse(
                replacement.getId(), replacement.getTxnRef(), amount, checkoutForm);
    }

    // Simulation Payment (PRESERVED - unchanged)
    @Transactional
    public SimulationPaymentResponse createSimulationPayment(String userId, CreateSimulationPaymentRequest request) {
        CourseService.CoursePrice course = courseService.getCoursePrice(request.getCourseId());

        if (course == null) {
            throw new CourseNotFoundException(request.getCourseId());
        }

        BigDecimal amount = course.price();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0 || amount.scale() > 0) {
            throw new IllegalArgumentException("Invalid course price");
        }

        Integer amountInt = amount.intValue();

        // Check if user already has an active payment for this course
        if (courseService.hasActivePaymentForCourse(userId, request.getCourseId())) {
            throw new IllegalStateException("User already has an active payment for this course");
        }

        String txnRef = generateTxnRef("SIM");
        Payment payment = new Payment(userId, request.getCourseId(), amountInt, PaymentMethod.SIMULATION, "SIMULATION", txnRef);
        payment = paymentRepository.save(payment);

        return toSimulationPaymentResponse("pending", payment);
    }

    @Transactional
    public SimulationPaymentResponse confirmSimulationPayment(String userId, String paymentId) {
        Payment payment = findOwnedSimulationPayment(userId, paymentId);

        if (payment.getStatus() == PaymentStatus.PAID) {
            return toSimulationPaymentResponse("already_paid", payment);
        }

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new InvalidPaymentStateException("Payment cannot be confirmed");
        }

        LocalDateTime confirmedAt = LocalDateTime.now();
        Payment settled = settlePaidPaymentAndActivateEnrollment(payment.getId(), "SIM-" + payment.getTxnRef(),
                "{\"provider\":\"SIMULATION\",\"action\":\"confirm\",\"confirmedAt\":\"" + confirmedAt + "\"}", confirmedAt);

        return toSimulationPaymentResponse(settled.getStatus() == PaymentStatus.PAID ? "success" : "already_paid", settled);
    }

    @Transactional
    public SimulationPaymentResponse failSimulationPayment(String userId, String paymentId) {
        Payment payment = findOwnedSimulationPayment(userId, paymentId);

        if (payment.getStatus() == PaymentStatus.FAILED) {
            return toSimulationPaymentResponse("failed", payment);
        }

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new InvalidPaymentStateException("Payment cannot be failed");
        }

        Payment failed = markPendingPaymentFailed(payment.getId(), "SIM-" + payment.getTxnRef(),
                "{\"provider\":\"SIMULATION\",\"action\":\"fail\",\"failedAt\":\"" + LocalDateTime.now() + "\"}");

        return toSimulationPaymentResponse("failed", failed);
    }

    // SePay Return URL handling (browser redirect from SePay)
    public SepayReturnResponse handleSepayReturn(SepayReturnQuery query) {
        String invoiceNumber = query.getOrderInvoiceNumber();
        if (invoiceNumber == null) {
            invoiceNumber = query.getOrderId();
        }
        final String finalInvoiceNumber = invoiceNumber;

        Payment payment = paymentRepository.findByTxnRef(finalInvoiceNumber)
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found for txnRef", finalInvoiceNumber));

        // Return endpoint does NOT confirm payment - only shows current state
        // Payment is confirmed only via IPN
        String status;
        if (payment.getStatus() == PaymentStatus.PAID) {
            status = "already_paid";
        } else if (payment.getStatus() == PaymentStatus.PENDING) {
            status = "pending";
        } else if (payment.getStatus() == PaymentStatus.FAILED) {
            status = "failed";
        } else if (payment.getStatus() == PaymentStatus.CANCELLED) {
            status = "cancelled";
        } else if (payment.getStatus() == PaymentStatus.EXPIRED) {
            status = "expired";
        } else {
            status = "unknown";
        }

        return new SepayReturnResponse(status, toPaymentResponseDto(payment));
    }

    // SePay IPN (server-to-server notification) - AUTHORITATIVE payment confirmation
    public SepayIpnResponse handleSepayIpn(String secretKey, SepayIpnRequest request) {
        try {
            // Step 1: Verify IPN signature (authentication)
            if (!sepayService.verifyIpnSignature(secretKey)) {
                log.warn("SePay IPN authentication failed");
                return SepayIpnResponse.invalidSignature();
            }

            // Step 2: Validate notification type
            if (request.getNotificationType() == null) {
                log.warn("SePay IPN missing notification_type");
                return SepayIpnResponse.invalidNotification();
            }

            // Step 3: Find payment by invoice number
            String invoiceNumber = request.getOrder() != null ? request.getOrder().getOrderInvoiceNumber() : null;
            if (invoiceNumber == null) {
                log.warn("SePay IPN missing order_invoice_number");
                return SepayIpnResponse.invalidNotification();
            }

            Optional<Payment> paymentOpt = paymentRepository.findByTxnRef(invoiceNumber);
            if (paymentOpt.isEmpty()) {
                log.warn("SePay IPN order not found: {}", invoiceNumber);
                return SepayIpnResponse.orderNotFound();
            }

            Payment payment = paymentOpt.get();

            // Step 4: Validate payment method and provider
            if (payment.getPaymentMethod() != PaymentMethod.SEPAY || !"SEPAY".equals(payment.getProvider())) {
                log.warn("SePay IPN received for non-SePay payment: {}", invoiceNumber);
                return SepayIpnResponse.invalidNotification();
            }

            // Step 5: Process based on notification type
            if (sepayService.isOrderPaidNotification(request.getNotificationType())) {
                return processOrderPaidIpn(payment, request);
            } else if (sepayService.isTransactionVoidNotification(request.getNotificationType())) {
                return processTransactionVoidIpn(payment, request);
            } else {
                log.warn("SePay IPN unknown notification_type: {}", request.getNotificationType());
                return SepayIpnResponse.invalidNotification();
            }
        } catch (IllegalArgumentException e) {
            log.warn("SePay IPN validation failed: {}", e.getMessage());
            // Determine specific error from message
            String msg = e.getMessage().toLowerCase();
            if (msg.contains("amount")) {
                return SepayIpnResponse.amountMismatch();
            } else if (msg.contains("currency")) {
                return SepayIpnResponse.currencyMismatch();
            }
            return SepayIpnResponse.invalidNotification();
        } catch (Exception e) {
            log.error("SePay IPN processing error", e);
            return SepayIpnResponse.internalError();
        }
    }

    private SepayIpnResponse processOrderPaidIpn(Payment payment, SepayIpnRequest request) {
        // Validate amount and currency
        sepayService.validateAmountAndCurrency(payment, request);

        // Check if already paid - idempotent
        if (payment.getStatus() == PaymentStatus.PAID) {
            if (!ensureEnrollmentSafely(payment, payment.getPaidAt())) {
                return SepayIpnResponse.internalError();
            }
            log.info("SePay IPN: Payment already PAID, idempotent response: {}", payment.getTxnRef());
            return SepayIpnResponse.alreadyProcessed();
        }

        // Don't overwrite terminal states (FAILED, CANCELLED, EXPIRED)
        if (payment.getStatus() != PaymentStatus.PENDING) {
            log.info("SePay IPN: Payment in terminal state {}, not overwriting: {}", payment.getStatus(), payment.getTxnRef());
            return SepayIpnResponse.alreadyProcessed();
        }

        // Step 6: Atomic settlement - only transitions PENDING -> PAID
        String providerPaymentId = request.getTransaction() != null ? request.getTransaction().getTransactionId() : null;
        String providerMetadata = "{\"provider\":\"SEPAY\",\"notificationType\":\"ORDER_PAID\"}";
        LocalDateTime paidAt = LocalDateTime.now();

        int updated = paymentRepository.settlePaymentIfPending(
                payment.getId(),
                PaymentStatus.PAID,
                providerPaymentId,
                providerMetadata,
                paidAt,
                true,
                PaymentStatus.PENDING
        );

        if (updated == 0) {
            // Race condition: another thread already updated it
            Payment current = paymentRepository.findById(payment.getId()).orElseThrow();
            if (current.getStatus() == PaymentStatus.PAID) {
                if (!ensureEnrollmentSafely(current, current.getPaidAt())) {
                    return SepayIpnResponse.internalError();
                }
                return SepayIpnResponse.alreadyProcessed();
            }
            // Payment in terminal state, don't overwrite
            return SepayIpnResponse.alreadyProcessed();
        }

        // Reload payment after update
        final String paymentId = payment.getId();
        payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException(paymentId));

        // Step 7: Activate enrollment (reuse existing logic)
        if (!activateEnrollmentSafely(payment, paidAt)) {
            return SepayIpnResponse.internalError();
        }

        log.info("SePay IPN: Payment settled successfully: {}", payment.getTxnRef());
        return SepayIpnResponse.success();
    }

    private SepayIpnResponse processTransactionVoidIpn(Payment payment, SepayIpnRequest request) {
        // Validate amount and currency
        sepayService.validateAmountAndCurrency(payment, request);

        // If already paid, don't reverse
        if (payment.getStatus() == PaymentStatus.PAID) {
            log.info("SePay IPN: TRANSACTION_VOID for already PAID payment, ignoring: {}", payment.getTxnRef());
            return SepayIpnResponse.alreadyProcessed();
        }

        // If already in terminal state, don't change
        if (payment.getStatus() != PaymentStatus.PENDING) {
            log.info("SePay IPN: TRANSACTION_VOID for payment in state {}, not changing: {}", payment.getStatus(), payment.getTxnRef());
            return SepayIpnResponse.alreadyProcessed();
        }

        // Mark pending payment as failed
        String providerPaymentId = request.getTransaction() != null ? request.getTransaction().getTransactionId() : null;
        String providerMetadata = "{\"provider\":\"SEPAY\",\"notificationType\":\"TRANSACTION_VOID\"}";

        int updated = paymentRepository.markPendingPaymentFailed(
                payment.getId(), PaymentStatus.FAILED, providerPaymentId, providerMetadata, PaymentStatus.PENDING);
        if (updated == 0) {
            log.info("SePay IPN: Payment changed while processing TRANSACTION_VOID: {}", payment.getTxnRef());
            return SepayIpnResponse.alreadyProcessed();
        }

        log.info("SePay IPN: Payment marked FAILED due to TRANSACTION_VOID: {}", payment.getTxnRef());
        return SepayIpnResponse.success();
    }

    // Get learner payment history
    public GetPaymentsResponse getLearnerPayments(String learnerId, GetPaymentsQuery query) {
        int page = Math.max(query.getPage() != null ? query.getPage() : 1, 1);
        int limit = Math.min(Math.max(query.getLimit() != null ? query.getLimit() : DEFAULT_PAYMENT_LIMIT, 1), MAX_PAYMENT_LIMIT);
        int offset = (page - 1) * limit;

        List<Payment> payments = paymentRepository.findByUserIdOrderByCreatedAtDesc(
                learnerId, PageRequest.of(offset / limit, limit));
        long total = paymentRepository.countByUserId(learnerId);

        int totalPages = (int) Math.ceil((double) total / limit);

        List<LearnerPaymentItem> items = payments.stream()
                .map(this::toLearnerPaymentItem)
                .toList();

        GetPaymentsResponse.PaginationMeta meta = GetPaymentsResponse.PaginationMeta.builder()
                .page(page)
                .limit(limit)
                .total(total)
                .totalPages(totalPages)
                .hasNextPage(page < totalPages)
                .hasPreviousPage(page > 1)
                .build();

        return new GetPaymentsResponse(items, meta);
    }

    // Private helper methods
    private Payment findOwnedSimulationPayment(String userId, String paymentId) {
        return paymentRepository.findByIdAndUserIdAndPaymentMethodAndProvider(
                        paymentId, userId, PaymentMethod.SIMULATION, "SIMULATION")
                .orElseThrow(() -> new PaymentNotFoundException(paymentId));
    }

    @Transactional
    protected Payment settlePaidPaymentAndActivateEnrollment(String paymentId, String providerPaymentId,
                                                             String providerMetadata, LocalDateTime paidAt) {
        // First update the payment
        int updated = paymentRepository.updatePayment(paymentId, PaymentStatus.PAID, providerPaymentId,
                providerMetadata, paidAt, true, null);

        if (updated == 0) {
            throw new PaymentNotFoundException(paymentId);
        }

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException(paymentId));

        // Then activate enrollment
        try {
            enrollmentService.activateEnrollmentForPayment(payment, paidAt);
        } catch (Exception e) {
            log.error("Failed to activate enrollment for payment {}", paymentId, e);
            // Payment is already marked as PAID, enrollment activation can be retried
        }

        return payment;
    }

    private Payment markPendingPaymentFailed(String paymentId, String providerPaymentId, String providerMetadata) {
        int updated = paymentRepository.markPendingPaymentFailed(paymentId, PaymentStatus.FAILED,
                providerPaymentId, providerMetadata, PaymentStatus.PENDING);

        if (updated == 0) {
            throw new PaymentNotFoundException(paymentId);
        }

        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException(paymentId));
    }

    private boolean activateEnrollmentSafely(Payment payment, LocalDateTime enrolledAt) {
        try {
            enrollmentService.activateEnrollmentForPayment(
                    payment, enrolledAt != null ? enrolledAt : LocalDateTime.now());
            return true;
        } catch (Exception e) {
            log.error("Failed to activate enrollment for payment {}", payment.getId(), e);
            return false;
        }
    }

    private boolean ensureEnrollmentSafely(Payment payment, LocalDateTime enrolledAt) {
        try {
            enrollmentService.ensureEnrollmentForPayment(
                    payment, enrolledAt != null ? enrolledAt : LocalDateTime.now());
            return true;
        } catch (Exception e) {
            log.error("Failed to retry enrollment activation for payment {}", payment.getId(), e);
            return false;
        }
    }

    private String generateTxnRef(String prefix) {
        if ("PAY".equals(prefix)) {
            return prefix + System.currentTimeMillis() +
                    UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        }
        return prefix + "_" + System.currentTimeMillis() + "_" + UUID.randomUUID();
    }

    private Integer validateSepayAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0 ||
                amount.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("Invalid course price");
        }
        try {
            return amount.intValueExact();
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("Invalid course price", exception);
        }
    }

    private SimulationPaymentResponse toSimulationPaymentResponse(String status, Payment payment) {
        return new SimulationPaymentResponse(status, toPaymentResponseDto(payment));
    }

    private PaymentResponseDto toPaymentResponseDto(Payment payment) {
        return PaymentResponseDto.builder()
                .id(payment.getId())
                .userId(payment.getUserId())
                .courseId(payment.getCourseId())
                .amount(BigDecimal.valueOf(payment.getAmount()))
                .currency(payment.getCurrency())
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .provider(payment.getProvider())
                .txnRef(payment.getTxnRef())
                .providerPaymentId(payment.getProviderPaymentId())
                .paidAt(payment.getPaidAt())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }

    private LearnerPaymentItem toLearnerPaymentItem(Payment payment) {
        return LearnerPaymentItem.builder()
                .id(payment.getId())
                .amount(BigDecimal.valueOf(payment.getAmount()))
                .currency(payment.getCurrency())
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .paidAt(payment.getPaidAt())
                .createdAt(payment.getCreatedAt())
                .course(new LearnerPaymentItem.CourseSummary(
                        payment.getCourseId(),
                        "", // title
                        "", // slug
                        null // thumbnailUrl
                ))
                .build();
    }
}