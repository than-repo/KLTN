package com.springservice.payment.exception;

public class CourseUnavailableException extends RuntimeException {

    public CourseUnavailableException(String courseId, String reason) {
        super("Course " + courseId + " is unavailable: " + reason);
    }
}