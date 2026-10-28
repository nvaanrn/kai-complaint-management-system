-- DropForeignKey
ALTER TABLE `complaint` DROP FOREIGN KEY `Complaint_slaPolicyId_fkey`;

-- AlterTable
ALTER TABLE `complaint` DROP COLUMN `slaCalendarType`,
    DROP COLUMN `slaPolicyId`,
    DROP COLUMN `slaTargetHours`;

-- DropTable
DROP TABLE `slapolicy`;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ComplaintCounter` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `lastSequence` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ComplaintCounter_year_key`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
