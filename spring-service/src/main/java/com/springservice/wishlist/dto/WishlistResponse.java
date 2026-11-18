package com.springservice.wishlist.dto;

public record WishlistResponse<T>(boolean success, String message, T data) {
}