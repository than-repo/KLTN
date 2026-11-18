package com.springservice.wishlist.exception;

public class InvalidCourseIdException extends RuntimeException {

    public InvalidCourseIdException() {
        super("courseId must be a UUID");
    }
}