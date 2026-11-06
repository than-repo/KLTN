package com.springservice.service;

import java.util.List;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.springservice.dto.WishlistAddResult;
import com.springservice.dto.WishlistItemResponse;
import com.springservice.dto.WishlistRemoveResult;
import com.springservice.entity.Wishlist;
import com.springservice.exception.InvalidCourseIdException;
import com.springservice.repository.WishlistRepository;

@Service
public class WishlistService {

    private final WishlistRepository wishlistRepository;

    public WishlistService(WishlistRepository wishlistRepository) {
        this.wishlistRepository = wishlistRepository;
    }

    public WishlistAddResult addCourse(String userId, String requestedCourseId) {
        String courseId = normalizeCourseId(requestedCourseId);
        if (wishlistRepository.existsByUserIdAndCourseId(userId, courseId)) {
            return new WishlistAddResult(courseId, false);
        }

        try {
            wishlistRepository.saveAndFlush(new Wishlist(userId, courseId));
            return new WishlistAddResult(courseId, true);
        } catch (DataIntegrityViolationException exception) {
            if (wishlistRepository.existsByUserIdAndCourseId(userId, courseId)) {
                return new WishlistAddResult(courseId, false);
            }
            throw exception;
        }
    }

    @Transactional
    public WishlistRemoveResult removeCourse(String userId, String requestedCourseId) {
        String courseId = normalizeCourseId(requestedCourseId);
        int deletedCount = wishlistRepository.deleteByUserIdAndCourseId(userId, courseId);
        return new WishlistRemoveResult(courseId, deletedCount > 0);
    }

    @Transactional(readOnly = true)
    public List<WishlistItemResponse> getWishlist(String userId) {
        return wishlistRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(item -> new WishlistItemResponse(item.getCourseId(), item.getCreatedAt()))
                .toList();
    }

    private String normalizeCourseId(String courseId) {
        UUID parsed;
        try {
            parsed = UUID.fromString(courseId);
        } catch (IllegalArgumentException exception) {
            throw new InvalidCourseIdException();
        }
        if (!parsed.toString().equalsIgnoreCase(courseId)) {
            throw new InvalidCourseIdException();
        }
        return parsed.toString();
    }
}
