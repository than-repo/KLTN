/*
  Warnings:

  - You are about to drop the column `easyQuestionCount` on the `assessment_questions` table. All the data in the column will be lost.
  - You are about to drop the column `hardQuestionCount` on the `assessment_questions` table. All the data in the column will be lost.
  - You are about to drop the column `mediumQuestionCount` on the `assessment_questions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `assessment_questions` DROP COLUMN `easyQuestionCount`,
    DROP COLUMN `hardQuestionCount`,
    DROP COLUMN `mediumQuestionCount`;

-- AlterTable
ALTER TABLE `assessments` ADD COLUMN `easyQuestionCount` INTEGER NULL,
    ADD COLUMN `hardQuestionCount` INTEGER NULL,
    ADD COLUMN `mediumQuestionCount` INTEGER NULL;
