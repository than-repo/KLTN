package com.springservice.wishlist.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.springservice.wishlist.dto.WishlistResponse;

@RestControllerAdvice
public class WishlistExceptionHandler {

    @ExceptionHandler(InvalidCourseIdException.class)
    public ResponseEntity<WishlistResponse<Void>> handleInvalidCourseId(
            InvalidCourseIdException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new WishlistResponse<>(false, exception.getMessage(), null));
    }
}