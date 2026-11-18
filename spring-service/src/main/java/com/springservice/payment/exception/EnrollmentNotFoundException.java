package com.springservice.payment.exception;

public class EnrollmentNotFoundException extends RuntimeException {

    public EnrollmentNotFoundException(String userId, String courseId) {
        super("Enrollment not found for user " + userId + " in course " + courseId);
    }
}