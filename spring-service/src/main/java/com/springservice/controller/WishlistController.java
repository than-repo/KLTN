package com.springservice.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.springservice.dto.WishlistAddResult;
import com.springservice.dto.WishlistItemResponse;
import com.springservice.dto.WishlistRemoveResult;
import com.springservice.dto.WishlistResponse;
import com.springservice.service.WishlistService;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @PostMapping("/courses/{courseId}")
    public ResponseEntity<WishlistResponse<WishlistAddResult>> addCourse(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String courseId) {
        WishlistAddResult result = wishlistService.addCourse(jwt.getSubject(), courseId);
        String message = result.added() ? "Course added to wishlist" : "Course already in wishlist";
        WishlistResponse<WishlistAddResult> response = new WishlistResponse<>(true, message, result);

        if (!result.added()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.created(URI.create("/api/wishlist/courses/" + result.courseId()))
                .body(response);
    }

    @DeleteMapping("/courses/{courseId}")
    public ResponseEntity<WishlistResponse<WishlistRemoveResult>> removeCourse(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String courseId) {
        WishlistRemoveResult result = wishlistService.removeCourse(jwt.getSubject(), courseId);
        String message = result.removed()
                ? "Course removed from wishlist"
                : "Course was not in wishlist";
        return ResponseEntity.ok(new WishlistResponse<>(true, message, result));
    }

    @GetMapping
    public ResponseEntity<WishlistResponse<List<WishlistItemResponse>>> getWishlist(
            @AuthenticationPrincipal Jwt jwt) {
        List<WishlistItemResponse> items = wishlistService.getWishlist(jwt.getSubject());
        return ResponseEntity.ok(new WishlistResponse<>(true, "Wishlist retrieved successfully", items));
    }
}
