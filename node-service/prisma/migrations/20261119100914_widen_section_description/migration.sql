-- AlterTable
ALTER TABLE `course_sections` MODIFY `description` TEXT NULL;

-- CreateTable
CREATE TABLE `wishlist` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flyway_schema_history` (
    `installed_rank` INTEGER NOT NULL,
    `version` VARCHAR(50) NULL,
    `description` VARCHAR(200) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `script` VARCHAR(1000) NOT NULL,
    `checksum` INTEGER NULL,
    `installed_by` VARCHAR(100) NOT NULL,
    `installed_on` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `execution_time` INTEGER NOT NULL,
    `success` BOOLEAN NOT NULL,

    PRIMARY KEY (`installed_rank`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
