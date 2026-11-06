CREATE TABLE wishlist (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    course_id VARCHAR(191) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_wishlist PRIMARY KEY (id),
    CONSTRAINT uk_wishlist_user_course UNIQUE (user_id, course_id),
    INDEX idx_wishlist_user_id (user_id),
    INDEX idx_wishlist_course_id (course_id),
    CONSTRAINT fk_wishlist_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_wishlist_course
        FOREIGN KEY (course_id) REFERENCES courses (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
