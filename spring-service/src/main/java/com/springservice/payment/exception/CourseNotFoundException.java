package com.springservice.payment.exception;

public class CourseNotFoundException extends RuntimeException {

    public CourseNotFoundException(String courseId) {
        super("Course not found: " + courseId);
    }
}