package com.springservice.payment.service;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.springservice.payment.dto.SepayCheckoutForm;
import com.springservice.payment.dto.SepayIpnRequest;
import com.springservice.payment.entity.Payment;
import com.springservice.payment.entity.PaymentMethod;
import com.springservice.payment.entity.PaymentStatus;
import com.springservice.payment.exception.InvalidPaymentStateException;
import com.springservice.payment.exception.PaymentNotFoundException;
import com.springservice.payment.repository.PaymentRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentServiceSepayTest {

    private static final String USER_ID = "user-123";
    private static final String COURSE_ID = "course-456";
    private static final String PAYMENT_ID = "payment-pending";

    private PaymentRepository paymentRepository;
    private SepayService sepayService;
    private SepayGatewayClient sepayGatewayClient;
    private CourseService courseService;
    private EnrollmentService enrollmentService;
    private PaymentService paymentService;
    private Payment pendingPayment;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        sepayService = mock(SepayService.class);
        sepayGatewayClient = mock(SepayGatewayClient.class);
        courseService = mock(CourseService.class);
        enrollmentService = mock(EnrollmentService.class);
        paymentService = new PaymentService(
                paymentRepository,
                sepayService,
                sepayGatewayClient,
                courseService,
                enrollmentService);

        pendingPayment = new Payment(
                USER_ID, COURSE_ID, 100000, PaymentMethod.SEPAY, "SEPAY", "PAY_OLD");
        pendingPayment.setId(PAYMENT_ID);
    }

    @Test
    void pendingPaymentCanBeCancelledAtSePayBeforeReplacementIsCreated() {
        when(paymentRepository.findByIdAndUserIdAndPaymentMethodAndProvider(
                PAYMENT_ID, USER_ID, PaymentMethod.SEPAY, "SEPAY"))
                .thenReturn(Optional.of(pendingPayment));
        when(courseService.getCoursePrice(COURSE_ID))
                .thenReturn(new CourseService.CoursePrice(COURSE_ID, new BigDecimal("125000.00"), "VND"));
        when(paymentRepository.cancelPendingPayment(
                PAYMENT_ID, PaymentStatus.CANCELLED, PaymentStatus.PENDING))
                .thenReturn(1);
        when(courseService.hasActivePaymentForCourse(USER_ID, COURSE_ID)).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment replacement = invocation.getArgument(0);
            replacement.setId("payment-replacement");
            return replacement;
        });
        when(sepayService.createCheckoutForm(any(Payment.class))).thenReturn(
                SepayCheckoutForm.builder()
                        .actionUrl("https://pay-sandbox.sepay.vn/v1/checkout/init")
                        .method("POST")
                        .fields(java.util.Map.of("order_invoice_number", "PAY_NEW"))
                        .build());

        var response = paymentService.replacePendingSepayPayment(USER_ID, PAYMENT_ID);

        assertEquals("payment-replacement", response.getPaymentId());
        assertEquals(new BigDecimal("125000.00"), response.getAmount());
        assertNotEquals("PAY_OLD", response.getTxnRef());
        var order = inOrder(sepayGatewayClient, paymentRepository);
        order.verify(sepayGatewayClient).cancelOrder("PAY_OLD");
        order.verify(paymentRepository).cancelPendingPayment(
                PAYMENT_ID, PaymentStatus.CANCELLED, PaymentStatus.PENDING);
        order.verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void replacementIsNotCreatedWhenPaymentBecomesPaidDuringCancellation() {
        Payment paidPayment = new Payment(
                USER_ID, COURSE_ID, 100000, PaymentMethod.SEPAY, "SEPAY", "PAY_OLD");
        paidPayment.setId(PAYMENT_ID);
        paidPayment.setStatus(PaymentStatus.PAID);

        when(paymentRepository.findByIdAndUserIdAndPaymentMethodAndProvider(
                PAYMENT_ID, USER_ID, PaymentMethod.SEPAY, "SEPAY"))
                .thenReturn(Optional.of(pendingPayment));
        when(courseService.getCoursePrice(COURSE_ID))
                .thenReturn(new CourseService.CoursePrice(COURSE_ID, BigDecimal.valueOf(100000), "VND"));
        when(paymentRepository.cancelPendingPayment(
                PAYMENT_ID, PaymentStatus.CANCELLED, PaymentStatus.PENDING))
                .thenReturn(0);
        when(paymentRepository.findById(PAYMENT_ID)).thenReturn(Optional.of(paidPayment));

        assertThrows(InvalidPaymentStateException.class,
                () -> paymentService.replacePendingSepayPayment(USER_ID, PAYMENT_ID));

        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void paymentCannotBeReplacedByAnotherUsersRequest() {
        when(paymentRepository.findByIdAndUserIdAndPaymentMethodAndProvider(
                PAYMENT_ID, "another-user", PaymentMethod.SEPAY, "SEPAY"))
                .thenReturn(Optional.empty());

        assertThrows(PaymentNotFoundException.class,
                () -> paymentService.replacePendingSepayPayment("another-user", PAYMENT_ID));

        verify(sepayGatewayClient, never()).cancelOrder(any());
    }

    @Test
    void pendingLookupOnlyReturnsPendingSePayPaymentsForTheLearner() {
        when(paymentRepository
                .findFirstByUserIdAndCourseIdAndPaymentMethodAndProviderAndIsActiveTrueAndDeletedAtIsNullAndStatusOrderByCreatedAtDesc(
                        USER_ID, COURSE_ID, PaymentMethod.SEPAY, "SEPAY", PaymentStatus.PENDING))
                .thenReturn(Optional.of(pendingPayment));

        var pending = paymentService.getPendingSepayPayment(USER_ID, COURSE_ID);

        assertEquals(PAYMENT_ID, pending.orElseThrow().paymentId());
        assertEquals("PAY_OLD", pending.orElseThrow().txnRef());
    }

    @Test
    void duplicatePaidIpnRetriesEnrollmentAfterItsFirstActivationFailed() {
        Payment paidPayment = new Payment(
                USER_ID, COURSE_ID, 100000, PaymentMethod.SEPAY, "SEPAY", "PAY_OLD");
        paidPayment.setId(PAYMENT_ID);
        paidPayment.setStatus(PaymentStatus.PAID);

        when(sepayService.verifyIpnSignature("ipn-secret")).thenReturn(true);
        when(sepayService.isOrderPaidNotification("ORDER_PAID")).thenReturn(true);
        when(paymentRepository.findByTxnRef("PAY_OLD"))
                .thenReturn(Optional.of(pendingPayment), Optional.of(paidPayment));
        when(paymentRepository.settlePaymentIfPending(
                eq(PAYMENT_ID),
                eq(PaymentStatus.PAID),
                any(),
                any(),
                any(),
                eq(true),
                eq(PaymentStatus.PENDING)))
                .thenReturn(1);
        when(paymentRepository.findById(PAYMENT_ID)).thenReturn(Optional.of(paidPayment));
        doThrow(new IllegalStateException("temporary enrollment failure"))
                .when(enrollmentService).activateEnrollmentForPayment(any(), any());

        SepayIpnRequest request = SepayIpnRequest.builder()
                .notificationType("ORDER_PAID")
                .order(SepayIpnRequest.Order.builder()
                        .orderInvoiceNumber("PAY_OLD")
                        .build())
                .build();

        var firstResponse = paymentService.handleSepayIpn("ipn-secret", request);
        var retryResponse = paymentService.handleSepayIpn("ipn-secret", request);

        assertEquals("INTERNAL_ERROR", firstResponse.getCode());
        assertEquals("ALREADY_PROCESSED", retryResponse.getCode());
        verify(enrollmentService).ensureEnrollmentForPayment(eq(paidPayment), any());
    }
}
