package com.springservice.dto;

import java.time.LocalDateTime;

public record WishlistItemResponse(String courseId, LocalDateTime createdAt) {
}
