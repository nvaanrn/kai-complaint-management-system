-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'PIC', 'VERIFIKATOR') NOT NULL DEFAULT 'PIC',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Complaint` (
    `id` VARCHAR(191) NOT NULL,
    `complaintNumber` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerContact` VARCHAR(191) NULL,
    `daopOrStation` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('BELUM_DITANGANI', 'DALAM_PENANGANAN', 'MENUNGGU_VERIFIKASI', 'TERVERIFIKASI') NOT NULL DEFAULT 'BELUM_DITANGANI',
    `picId` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `correctiveAction` TEXT NULL,
    `preventiveAction` TEXT NULL,
    `proofImageUrl` TEXT NULL,
    `notes` TEXT NULL,
    `documentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Complaint_complaintNumber_key`(`complaintNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Verification` (
    `id` VARCHAR(191) NOT NULL,
    `complaintId` VARCHAR(191) NOT NULL,
    `verifierId` VARCHAR(191) NOT NULL,
    `result` ENUM('APPROVED', 'REJECTED') NOT NULL,
    `feedback` TEXT NULL,
    `verifiedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `documentNumber` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `documentDate` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `managementRep` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_picId_fkey` FOREIGN KEY (`picId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Verification` ADD CONSTRAINT `Verification_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Verification` ADD CONSTRAINT `Verification_verifierId_fkey` FOREIGN KEY (`verifierId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
