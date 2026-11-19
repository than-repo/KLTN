package com.springservice.payment.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.springservice.payment.config.VnpayConfig;
import com.springservice.payment.dto.CreateSimulationPaymentRequest;
import com.springservice.payment.dto.CreateVnpayPaymentRequest;
import com.springservice.payment.dto.CreateVnpayPaymentResponse;
import com.springservice.payment.dto.CreateVnpayPaymentUrlParams;
import com.springservice.payment.dto.GetPaymentsQuery;
import com.springservice.payment.dto.GetPaymentsResponse;
import com.springservice.payment.dto.LearnerPaymentItem;
import com.springservice.payment.dto.PaymentResponseDto;
import com.springservice.payment.dto.SimulationPaymentResponse;
import com.springservice.payment.dto.VnpayIpnResponse;
import com.springservice.payment.dto.VnpayReturnQuery;
import com.springservice.payment.dto.VnpayReturnResponse;
import com.springservice.payment.dto.VnpayVerifyReturnResponse;
import com.springservice.payment.entity.Enrollment;
import com.springservice.payment.entity.Payment;
import com.springservice.payment.entity.PaymentMethod;
import com.springservice.payment.entity.PaymentStatus;
import com.springservice.payment.exception.CourseNotFoundException;
import com.springservice.payment.exception.CourseUnavailableException;
import com.springservice.payment.exception.InvalidPaymentStateException;
import com.springservice.payment.exception.PaymentNotFoundException;
import com.springservice.payment.exception.VnpaySignatureException;
import com.springservice.payment.repository.PaymentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final VnpayService vnpayService;
    private final VnpayConfig vnpayConfig;
    private final CourseService courseService;
    private final EnrollmentService enrollmentService;

    private static final int DEFAULT_PAYMENT_LIMIT = 10;
    private static final int MAX_PAYMENT_LIMIT = 50;

    // VNPay Payment
    public CreateVnpayPaymentResponse createVnpayPayment(String userId, CreateVnpayPaymentRequest request, String ipAddr) {
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

        String txnRef = generateTxnRef("PAY");

        Payment payment = new Payment(userId, request.getCourseId(), amountInt, PaymentMethod.VNPAY, "VNPAY", txnRef);
        payment = paymentRepository.save(payment);

        String paymentUrl = vnpayService.createPaymentUrl(new CreateVnpayPaymentUrlParams(
                txnRef,
                amount,
                "Thanh toan khoa hoc",
                ipAddr,
                request.getBankCode(),
                request.getLocale() != null ? request.getLocale() : "vn"
        ));

        return new CreateVnpayPaymentResponse(payment.getId(), payment.getTxnRef(), amount, paymentUrl);
    }

    // Simulation Payment
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

    // VNPay Return URL handling (user redirected back)
    public VnpayReturnResponse handleVnpayReturn(VnpayReturnQuery query) {
        java.util.Map<String, String> safeQuery = normalizeVnpayQuery(query);

        if (!vnpayService.verifyReturnUrl(safeQuery)) {
            throw new VnpaySignatureException("Invalid VNPay signature");
        }

        String txnRef = getRequiredVnpayParam(safeQuery, "vnp_TxnRef");
        String responseCode = getRequiredVnpayParam(safeQuery, "vnp_ResponseCode");
        String transactionStatus = getRequiredVnpayParam(safeQuery, "vnp_TransactionStatus");

        boolean isSuccess = "00".equals(responseCode) && "00".equals(transactionStatus);

        Payment payment = paymentRepository.findByTxnRef(txnRef)
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found for txnRef", txnRef));

        if (payment.getStatus() == PaymentStatus.PAID) {
            return toVnpayReturnResponse("already_paid", payment);
        }

        return toVnpayReturnResponse(isSuccess ? "success" : "failed", payment);
    }

    // VNPay Verify Return (for frontend to check payment result)
    public VnpayVerifyReturnResponse verifyVnpayReturn(VnpayReturnQuery query) {
        java.util.Map<String, String> safeQuery = normalizeVnpayQuery(query);

        if (!vnpayService.verifyReturnUrl(safeQuery)) {
            throw new VnpaySignatureException("Invalid VNPay signature");
        }

        String txnRef = getRequiredVnpayParam(safeQuery, "vnp_TxnRef");
        String responseCode = getRequiredVnpayParam(safeQuery, "vnp_ResponseCode");
        String transactionStatus = getRequiredVnpayParam(safeQuery, "vnp_TransactionStatus");

        boolean isSuccess = "00".equals(responseCode) && "00".equals(transactionStatus);

        Payment payment = paymentRepository.findByTxnRef(txnRef)
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found for txnRef", txnRef));

        if (payment.getStatus() == PaymentStatus.PAID) {
            return toVnpayVerifyReturnResponse("already_paid", payment);
        }

        return toVnpayVerifyReturnResponse(isSuccess ? "success" : "failed", payment);
    }

    private VnpayVerifyReturnResponse toVnpayVerifyReturnResponse(String status, Payment payment) {
        return new VnpayVerifyReturnResponse(status, toPaymentResponseDto(payment));
    }

    // VNPay IPN (server-to-server notification)
    public VnpayIpnResponse handleVnpayIpn(VnpayReturnQuery query) {
        try {
            java.util.Map<String, String> safeQuery = normalizeVnpayQuery(query);

            if (!vnpayService.verifyReturnUrl(safeQuery)) {
                return new VnpayIpnResponse("97", "Checksum failed");
            }

            String txnRef = safeQuery.get("vnp_TxnRef");
            String responseCode = safeQuery.get("vnp_ResponseCode");
            String transactionStatus = safeQuery.get("vnp_TransactionStatus");
            String vnpAmount = safeQuery.get("vnp_Amount");

            if (txnRef == null) {
                return new VnpayIpnResponse("01", "Order not found");
            }

            Optional<Payment> paymentOpt = paymentRepository.findByTxnRef(txnRef);
            if (paymentOpt.isEmpty()) {
                return new VnpayIpnResponse("01", "Order not found");
            }

            Payment payment = paymentOpt.get();

            // Validate amount (VNPay sends amount * 100)
            if (!isValidVnpayAmount(vnpAmount, payment.getAmount())) {
                return new VnpayIpnResponse("04", "Amount invalid");
            }

            boolean isSuccess = "00".equals(responseCode) &&
                    (transactionStatus == null || "00".equals(transactionStatus));

            if (isSuccess) {
                String providerPaymentId = safeQuery.get("vnp_TransactionNo");
                String providerMetadata = safeQuery.toString();

                Payment settled = settlePaidPaymentAndActivateEnrollment(
                        payment.getId(), providerPaymentId, providerMetadata, LocalDateTime.now());

                if (settled.getStatus() == PaymentStatus.PAID) {
                    return new VnpayIpnResponse("00", "Success");
                } else {
                    return new VnpayIpnResponse("02", "This order has been updated to the payment status");
                }
            }

            if (payment.getStatus() != PaymentStatus.PENDING) {
                return new VnpayIpnResponse("02", "This order has been updated to the payment status");
            }

            String providerPaymentId = safeQuery.get("vnp_TransactionNo");
            String providerMetadata = safeQuery.toString();
            markPendingPaymentFailed(payment.getId(), providerPaymentId, providerMetadata);

            return new VnpayIpnResponse("00", "Success");
        } catch (Exception e) {
            log.error("VNPay IPN error", e);
            return new VnpayIpnResponse("99", "Unknown error");
        }
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

    private String generateTxnRef(String prefix) {
        if ("PAY".equals(prefix)) {
            return prefix + System.currentTimeMillis() +
                    UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        }
        return prefix + "_" + System.currentTimeMillis() + "_" + UUID.randomUUID();
    }

    private java.util.Map<String, String> normalizeVnpayQuery(VnpayReturnQuery query) {
        java.util.Map<String, String> result = new java.util.LinkedHashMap<>();
        java.lang.reflect.Field[] fields = VnpayReturnQuery.class.getDeclaredFields();
        for (java.lang.reflect.Field field : fields) {
            field.setAccessible(true);
            try {
                Object value = field.get(query);
                if (value != null) {
                    String jsonName = field.getAnnotation(com.fasterxml.jackson.annotation.JsonProperty.class).value();
                    result.put(jsonName, value.toString());
                }
            } catch (IllegalAccessException e) {
                // ignore
            }
        }
        return result;
    }

    private String getRequiredVnpayParam(java.util.Map<String, String> query, String key) {
        String value = query.get(key);
        if (value == null || value.isEmpty()) {
            throw new IllegalArgumentException("Missing VNPay param: " + key);
        }
        return value;
    }

    private boolean isValidVnpayAmount(String vnpAmount, Integer paymentAmount) {
        if (vnpAmount == null || vnpAmount.isEmpty()) {
            return false;
        }
        try {
            Integer amount = Integer.valueOf(vnpAmount);
            // VNPay sends amount * 100
            return amount.equals(paymentAmount * 100);
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private SimulationPaymentResponse toSimulationPaymentResponse(String status, Payment payment) {
        return new SimulationPaymentResponse(status, toPaymentResponseDto(payment));
    }

    private VnpayReturnResponse toVnpayReturnResponse(String status, Payment payment) {
        return new VnpayReturnResponse(status, toPaymentResponseDto(payment));
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