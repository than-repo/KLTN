package com.springservice.dto;

public record WishlistResponse<T>(boolean success, String message, T data) {
}
