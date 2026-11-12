-- AlterTable
ALTER TABLE `assessments` ADD COLUMN `afterLessonId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_afterLessonId_fkey` FOREIGN KEY (`afterLessonId`) REFERENCES `lessons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
