package com.springservice.payment.exception;

public class EnrollmentAlreadyExistsException extends RuntimeException {

    public EnrollmentAlreadyExistsException(String userId, String courseId) {
        super("User " + userId + " is already enrolled in course " + courseId);
    }
}