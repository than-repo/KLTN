-- CreateTable
CREATE TABLE `_AssessmentQuestionSkills` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_AssessmentQuestionSkills_AB_unique`(`A` ASC, `B` ASC),
    INDEX `_AssessmentQuestionSkills_B_index`(`B` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_LessonSkills` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_LessonSkills_AB_unique`(`A` ASC, `B` ASC),
    INDEX `_LessonSkills_B_index`(`B` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_answers` (
    `id` VARCHAR(191) NOT NULL,
    `correctOptionAnswer` TEXT NULL,
    `correctTextAnswer` TEXT NULL,
    `wrongAnswers` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,

    INDEX `assessment_answers_questionId_idx`(`questionId` ASC),
    UNIQUE INDEX `assessment_answers_questionId_key`(`questionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_attempt_answers` (
    `id` VARCHAR(191) NOT NULL,
    `textAnswer` TEXT NULL,
    `answerSnapshot` TEXT NULL,
    `isCorrect` BOOLEAN NULL,
    `pointsEarned` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,

    INDEX `assessment_attempt_answers_attemptId_idx`(`attemptId` ASC),
    UNIQUE INDEX `assessment_attempt_answers_attemptId_questionId_key`(`attemptId` ASC, `questionId` ASC),
    INDEX `assessment_attempt_answers_questionId_idx`(`questionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'PASSED', 'FAILED') NOT NULL DEFAULT 'IN_PROGRESS',
    `score` DOUBLE NULL,
    `maxScore` DOUBLE NULL,
    `passed` BOOLEAN NOT NULL DEFAULT false,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submittedAt` DATETIME(3) NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `learnerId` VARCHAR(191) NOT NULL,

    INDEX `assessment_attempts_assessmentId_idx`(`assessmentId` ASC),
    UNIQUE INDEX `assessment_attempts_assessmentId_learnerId_attemptNumber_key`(`assessmentId` ASC, `learnerId` ASC, `attemptNumber` ASC),
    INDEX `assessment_attempts_learnerId_idx`(`learnerId` ASC),
    INDEX `assessment_attempts_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_questions` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `questionText` LONGTEXT NOT NULL,
    `type` ENUM('MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'PROJECT') NOT NULL,
    `explanation` LONGTEXT NULL,
    `points` INTEGER NOT NULL DEFAULT 1,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `assessment_questions_assessmentId_idx`(`assessmentId` ASC),
    INDEX `assessment_questions_type_idx`(`type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessments` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `type` ENUM('QUIZ', 'PROJECT') NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `order` INTEGER NOT NULL DEFAULT 0,
    `totalPoints` INTEGER NOT NULL DEFAULT 0,
    `passingScore` INTEGER NULL,
    `maxAttempts` INTEGER NULL,
    `timeLimitMinutes` INTEGER NULL,
    `availableFrom` DATETIME(3) NULL,
    `availableUntil` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `reviewContent` ENUM('SCORE_ONLY', 'SCORE_AND_ANSWERS', 'FULL_REVIEW') NOT NULL DEFAULT 'SCORE_ONLY',
    `reviewTiming` ENUM('NEVER', 'AFTER_SUBMIT', 'AFTER_GRADED', 'AFTER_ASSESSMENT_CLOSED', 'MANUAL') NOT NULL DEFAULT 'AFTER_GRADED',

    INDEX `assessments_courseId_idx`(`courseId` ASC),
    INDEX `assessments_status_idx`(`status` ASC),
    INDEX `assessments_type_idx`(`type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `categories_parentId_idx`(`parentId` ASC),
    UNIQUE INDEX `categories_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_categories` (
    `courseId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `course_categories_categoryId_fkey`(`categoryId` ASC),
    PRIMARY KEY (`courseId` ASC, `categoryId` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_instructors` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `instructorId` VARCHAR(191) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `course_instructors_courseId_instructorId_key`(`courseId` ASC, `instructorId` ASC),
    INDEX `course_instructors_instructorId_fkey`(`instructorId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_reviewer_categories` (
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `reviewerId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `course_reviewer_categories_categoryId_idx`(`categoryId` ASC),
    INDEX `course_reviewer_categories_reviewerId_idx`(`reviewerId` ASC),
    PRIMARY KEY (`reviewerId` ASC, `categoryId` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED') NOT NULL DEFAULT 'PENDING',
    `reviewNote` LONGTEXT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `reviewerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `course_reviews_courseId_idx`(`courseId` ASC),
    INDEX `course_reviews_reviewerId_idx`(`reviewerId` ASC),
    INDEX `course_reviews_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_sections` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `sectionIndex` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `course_sections_courseId_sectionIndex_key`(`courseId` ASC, `sectionIndex` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courses` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `shortDescription` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `whatYouWillLearn` JSON NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `level` ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCE', 'ALL_LEVELS') NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'IN_REVIEW', 'CHANGES_REQUESTED') NOT NULL DEFAULT 'DRAFT',
    `price` DECIMAL(10, 2) NULL,
    `language` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `certificateEnabled` BOOLEAN NOT NULL DEFAULT false,
    `cloudinaryPublicId` VARCHAR(191) NULL,
    `durationInMinutes` INTEGER NULL,
    `publishedAt` DATETIME(3) NULL,
    `requirements` JSON NULL,
    `reviewClaimedAt` DATETIME(3) NULL,
    `reviewClaimedById` VARCHAR(191) NULL,

    UNIQUE INDEX `courses_cloudinaryPublicId_key`(`cloudinaryPublicId` ASC),
    INDEX `courses_isActive_idx`(`isActive` ASC),
    INDEX `courses_reviewClaimedById_idx`(`reviewClaimedById` ASC),
    INDEX `courses_slug_idx`(`slug` ASC),
    UNIQUE INDEX `courses_slug_key`(`slug` ASC),
    INDEX `courses_status_idx`(`status` ASC),
    INDEX `courses_status_reviewClaimedById_idx`(`status` ASC, `reviewClaimedById` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enrollments` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `progressPercentage` DOUBLE NOT NULL DEFAULT 0,
    `enrolledAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `enrollments_courseId_idx`(`courseId` ASC),
    UNIQUE INDEX `enrollments_paymentId_key`(`paymentId` ASC),
    INDEX `enrollments_status_idx`(`status` ASC),
    UNIQUE INDEX `enrollments_userId_courseId_key`(`userId` ASC, `courseId` ASC),
    INDEX `enrollments_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_media` (
    `id` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` ENUM('VIDEO', 'DOCUMENT', 'IMAGE', 'AUDIO', 'OTHER') NOT NULL,
    `filename` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `sizeInBytes` INTEGER NULL,
    `cloudinaryPublicId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `file_media_cloudinaryPublicId_key`(`cloudinaryPublicId` ASC),
    INDEX `file_media_deletedAt_idx`(`deletedAt` ASC),
    INDEX `file_media_lessonId_idx`(`lessonId` ASC),
    INDEX `file_media_type_idx`(`type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lessons` (
    `id` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `lessonIndex` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `lessons_sectionId_lessonIndex_key`(`sectionId` ASC, `lessonIndex` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_tokenHash_key`(`tokenHash` ASC),
    INDEX `password_reset_tokens_userId_expiresAt_idx`(`userId` ASC, `expiresAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    `paymentMethod` ENUM('VNPAY', 'SIMULATION') NOT NULL DEFAULT 'VNPAY',
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `provider` VARCHAR(191) NOT NULL DEFAULT 'VNPAY',
    `providerPaymentId` VARCHAR(191) NULL,
    `providerMetadata` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `txnRef` VARCHAR(191) NULL,

    INDEX `payments_courseId_idx`(`courseId` ASC),
    INDEX `payments_status_idx`(`status` ASC),
    UNIQUE INDEX `payments_txnRef_key`(`txnRef` ASC),
    INDEX `payments_userId_courseId_idx`(`userId` ASC, `courseId` ASC),
    INDEX `payments_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `githubUrl` VARCHAR(191) NULL,
    `deployUrl` VARCHAR(191) NULL,
    `documentUrl` VARCHAR(191) NULL,
    `note` LONGTEXT NULL,
    `status` ENUM('SUBMITTED', 'REVIEWED', 'NEEDS_CHANGES', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `score` DOUBLE NULL,
    `feedback` LONGTEXT NULL,
    `gradedAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `graderId` VARCHAR(191) NULL,

    UNIQUE INDEX `project_submissions_attemptId_key`(`attemptId` ASC),
    INDEX `project_submissions_graderId_fkey`(`graderId` ASC),
    INDEX `project_submissions_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `deviceInfo` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `refresh_tokens_tokenHash_idx`(`tokenHash` ASC),
    UNIQUE INDEX `refresh_tokens_tokenHash_key`(`tokenHash` ASC),
    INDEX `refresh_tokens_userId_isRevoked_expiresAt_idx`(`userId` ASC, `isRevoked` ASC, `expiresAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `skills` (
    `id` VARCHAR(191) NOT NULL,
    `canonical_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `aliases` JSON NULL,
    `parent_id` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL DEFAULT 0,
    `embedding` JSON NULL,
    `deletedAt` DATETIME(3) NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'EASY',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `course_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `skills_course_id_canonical_name_key`(`course_id` ASC, `canonical_name` ASC),
    INDEX `skills_isActive_idx`(`isActive` ASC),
    INDEX `skills_parent_id_idx`(`parent_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_identities` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` ENUM('LOCAL', 'GOOGLE') NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `accessToken` LONGTEXT NULL,
    `refreshToken` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,

    UNIQUE INDEX `user_identities_userId_provider_providerId_key`(`userId` ASC, `provider` ASC, `providerId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `dateOfBirth` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY') NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `role` ENUM('LEARNER', 'INSTRUCTOR', 'REVIEWER', 'ADMIN') NOT NULL DEFAULT 'LEARNER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_AssessmentQuestionSkills` ADD CONSTRAINT `_AssessmentQuestionSkills_A_fkey` FOREIGN KEY (`A`) REFERENCES `assessment_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AssessmentQuestionSkills` ADD CONSTRAINT `_AssessmentQuestionSkills_B_fkey` FOREIGN KEY (`B`) REFERENCES `skills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LessonSkills` ADD CONSTRAINT `_LessonSkills_A_fkey` FOREIGN KEY (`A`) REFERENCES `lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LessonSkills` ADD CONSTRAINT `_LessonSkills_B_fkey` FOREIGN KEY (`B`) REFERENCES `skills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_answers` ADD CONSTRAINT `assessment_answers_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `assessment_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_attempt_answers` ADD CONSTRAINT `assessment_attempt_answers_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `assessment_attempts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_attempt_answers` ADD CONSTRAINT `assessment_attempt_answers_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `assessment_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_questions` ADD CONSTRAINT `assessment_questions_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_categories` ADD CONSTRAINT `course_categories_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_categories` ADD CONSTRAINT `course_categories_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_instructors` ADD CONSTRAINT `course_instructors_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_instructors` ADD CONSTRAINT `course_instructors_instructorId_fkey` FOREIGN KEY (`instructorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_reviewer_categories` ADD CONSTRAINT `course_reviewer_categories_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_reviewer_categories` ADD CONSTRAINT `course_reviewer_categories_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_reviews` ADD CONSTRAINT `course_reviews_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_reviews` ADD CONSTRAINT `course_reviews_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_sections` ADD CONSTRAINT `course_sections_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_reviewClaimedById_fkey` FOREIGN KEY (`reviewClaimedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_media` ADD CONSTRAINT `file_media_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `course_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_submissions` ADD CONSTRAINT `project_submissions_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `assessment_attempts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_submissions` ADD CONSTRAINT `project_submissions_graderId_fkey` FOREIGN KEY (`graderId`) REFERENCES `course_instructors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `skills` ADD CONSTRAINT `skills_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `skills` ADD CONSTRAINT `skills_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `skills`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_identities` ADD CONSTRAINT `user_identities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
