package com.springservice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.springservice.entity.Wishlist;

public interface WishlistRepository extends JpaRepository<Wishlist, String> {

    List<Wishlist> findAllByUserIdOrderByCreatedAtDesc(String userId);

    boolean existsByUserIdAndCourseId(String userId, String courseId);

    @Modifying
    @Query("delete from Wishlist w where w.userId = :userId and w.courseId = :courseId")
    int deleteByUserIdAndCourseId(
            @Param("userId") String userId,
            @Param("courseId") String courseId);
}
