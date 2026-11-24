package com.springservice.payment.service;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.springservice.payment.dto.CreateSimulationPaymentRequest;
import com.springservice.payment.entity.Payment;
import com.springservice.payment.exception.CourseUnavailableException;
import com.springservice.payment.repository.PaymentRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentServiceSimulationTest {

    private static final String USER_ID = "user-123";
    private static final String COURSE_ID = "4d03eaa9-ace3-4ce5-93a0-fa9930117df1";

    private PaymentRepository paymentRepository;
    private CourseService courseService;
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        courseService = mock(CourseService.class);
        paymentService = new PaymentService(
                paymentRepository,
                mock(SepayService.class),
                mock(SepayGatewayClient.class),
                courseService,
                mock(EnrollmentService.class));
    }

    @Test
    void publishedCourseCreatesPendingSimulationPayment() {
        CreateSimulationPaymentRequest request = new CreateSimulationPaymentRequest(COURSE_ID);
        when(courseService.getCoursePrice(COURSE_ID))
                .thenReturn(new CourseService.CoursePrice(COURSE_ID, BigDecimal.valueOf(100000), "VND"));
        when(courseService.hasActivePaymentForCourse(USER_ID, COURSE_ID)).thenReturn(false);
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = paymentService.createSimulationPayment(USER_ID, request);

        assertEquals("pending", response.getStatus());
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void duplicateActivePaymentIsRejected() {
        CreateSimulationPaymentRequest request = new CreateSimulationPaymentRequest(COURSE_ID);
        when(courseService.getCoursePrice(COURSE_ID))
                .thenReturn(new CourseService.CoursePrice(COURSE_ID, BigDecimal.valueOf(100000), "VND"));
        when(courseService.hasActivePaymentForCourse(USER_ID, COURSE_ID)).thenReturn(true);

        assertThrows(IllegalStateException.class,
                () -> paymentService.createSimulationPayment(USER_ID, request));
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void unpublishedCourseIsRejectedBeforePaymentCreation() {
        CreateSimulationPaymentRequest request = new CreateSimulationPaymentRequest(COURSE_ID);
        when(courseService.getCoursePrice(COURSE_ID))
                .thenThrow(new CourseUnavailableException(COURSE_ID, "Course is not published"));

        assertThrows(CourseUnavailableException.class,
                () -> paymentService.createSimulationPayment(USER_ID, request));
        verify(paymentRepository, never()).save(any(Payment.class));
    }
}
