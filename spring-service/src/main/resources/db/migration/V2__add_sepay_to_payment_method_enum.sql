-- Add SEPAY to paymentMethod enum if not already present
-- This migration is idempotent: it only adds SEPAY if missing
-- Preserves existing VNPAY and SIMULATION values and all records

-- MySQL 8.0+ supports ALTER TABLE ... MODIFY COLUMN with enum expansion
-- If SEPAY already exists, this is a no-op (no error, no change)
ALTER TABLE `payments`
MODIFY COLUMN `paymentMethod` ENUM('VNPAY', 'SIMULATION', 'SEPAY')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;