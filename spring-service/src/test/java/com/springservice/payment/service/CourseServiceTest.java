package com.springservice.payment.service;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.springservice.payment.client.CourseClient;
import com.springservice.payment.exception.CourseNotFoundException;
import com.springservice.payment.exception.CourseUnavailableException;
import com.springservice.payment.repository.PaymentRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CourseServiceTest {

    private static final String COURSE_ID = "4d03eaa9-ace3-4ce5-93a0-fa9930117df1";

    private PaymentRepository paymentRepository;
    private CourseClient courseClient;
    private CourseService courseService;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        courseClient = mock(CourseClient.class);
        courseService = new CourseService(paymentRepository, courseClient);
    }

    @Test
    void publishedCourseReturnedByPublicEndpointIsAcceptedWhenStatusFieldsAreMissing() {
        CourseClient.CoursePriceResponse course = new CourseClient.CoursePriceResponse(
                COURSE_ID, BigDecimal.valueOf(100000), "VND", "BEGINNER", null, null, null);
        CourseClient.CoursePriceResponseWrapper wrapper =
                new CourseClient.CoursePriceResponseWrapper(true, 200, null, null, List.of(course));

        when(courseClient.getCoursesByIds(COURSE_ID)).thenReturn(wrapper);

        CourseService.CoursePrice result = courseService.getCoursePrice(COURSE_ID);

        assertEquals(COURSE_ID, result.id());
        assertEquals(BigDecimal.valueOf(100000), result.price());
    }

    @Test
    void explicitlyUnpublishedCourseIsRejected() {
        CourseClient.CoursePriceResponse course = new CourseClient.CoursePriceResponse(
                COURSE_ID, BigDecimal.valueOf(100000), "VND", "BEGINNER", "DRAFT", true, null);
        CourseClient.CoursePriceResponseWrapper wrapper =
                new CourseClient.CoursePriceResponseWrapper(true, 200, null, null, List.of(course));

        when(courseClient.getCoursesByIds(COURSE_ID)).thenReturn(wrapper);

        assertThrows(CourseUnavailableException.class, () -> courseService.getCoursePrice(COURSE_ID));
    }

    @Test
    void inactiveCourseIsRejected() {
        CourseClient.CoursePriceResponse course = new CourseClient.CoursePriceResponse(
                COURSE_ID, BigDecimal.valueOf(100000), "VND", "BEGINNER", "PUBLISHED", false, null);
        CourseClient.CoursePriceResponseWrapper wrapper =
                new CourseClient.CoursePriceResponseWrapper(true, 200, null, null, List.of(course));

        when(courseClient.getCoursesByIds(COURSE_ID)).thenReturn(wrapper);

        assertThrows(CourseUnavailableException.class, () -> courseService.getCoursePrice(COURSE_ID));
    }

    @Test
    void missingCourseIsHandledAsNotFound() {
        CourseClient.CoursePriceResponseWrapper wrapper =
                new CourseClient.CoursePriceResponseWrapper(true, 200, null, null, List.of());

        when(courseClient.getCoursesByIds(COURSE_ID)).thenReturn(wrapper);

        assertThrows(CourseNotFoundException.class, () -> courseService.getCoursePrice(COURSE_ID));
    }

    @Test
    void returnedCourseIdMustMatchRequestedId() {
        CourseClient.CoursePriceResponse course = new CourseClient.CoursePriceResponse(
                "11111111-1111-4111-8111-111111111111", BigDecimal.valueOf(100000), "VND",
                "BEGINNER", null, null, null);
        CourseClient.CoursePriceResponseWrapper wrapper =
                new CourseClient.CoursePriceResponseWrapper(true, 200, null, null, List.of(course));

        when(courseClient.getCoursesByIds(COURSE_ID)).thenReturn(wrapper);

        assertThrows(CourseUnavailableException.class, () -> courseService.getCoursePrice(COURSE_ID));
    }
}
