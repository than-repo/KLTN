package com.springservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.springservice.dto.WishlistResponse;

@RestControllerAdvice
public class WishlistExceptionHandler {

    @ExceptionHandler(InvalidCourseIdException.class)
    public ResponseEntity<WishlistResponse<Void>> handleInvalidCourseId(
            InvalidCourseIdException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new WishlistResponse<>(false, exception.getMessage(), null));
    }
}
