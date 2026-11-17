-- AlterTable
ALTER TABLE `complaint` ADD COLUMN `assignedAt` DATETIME(3) NULL,
    ADD COLUMN `category` ENUM('KESELAMATAN_KEAMANAN', 'FASILITAS_KERETA', 'FASILITAS_STASIUN', 'TIKET_DAN_SISTEM', 'PELAYANAN_PETUGAS', 'REFUND_DAN_TARIF', 'INFORMASI_DAN_LAINNYA') NULL,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `slaCalendarType` ENUM('CALENDAR_24_7', 'BUSINESS_HOURS') NULL DEFAULT 'CALENDAR_24_7',
    ADD COLUMN `slaPolicyId` VARCHAR(191) NULL,
    ADD COLUMN `slaTargetHours` INTEGER NULL,
    ADD COLUMN `submissionCount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `document` ADD COLUMN `parentDocumentId` VARCHAR(191) NULL,
    ADD COLUMN `publishedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `revisionNumber` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `revisionReason` TEXT NULL,
    ADD COLUMN `snapshotData` JSON NULL,
    ADD COLUMN `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'SUPERSEDED') NOT NULL DEFAULT 'PUBLISHED',
    ADD COLUMN `totalComplaints` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    MODIFY `version` VARCHAR(191) NOT NULL DEFAULT '002-2020';

-- AlterTable
ALTER TABLE `verification` ADD COLUMN `cycle` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `SlaPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('KESELAMATAN_KEAMANAN', 'FASILITAS_KERETA', 'FASILITAS_STASIUN', 'TIKET_DAN_SISTEM', 'PELAYANAN_PETUGAS', 'REFUND_DAN_TARIF', 'INFORMASI_DAN_LAINNYA') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `targetHours` INTEGER NOT NULL,
    `calendarType` ENUM('CALENDAR_24_7', 'BUSINESS_HOURS') NOT NULL DEFAULT 'CALENDAR_24_7',
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SlaPolicy_category_key`(`category`),
    INDEX `SlaPolicy_category_idx`(`category`),
    INDEX `SlaPolicy_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReopenRequest` (
    `id` VARCHAR(191) NOT NULL,
    `complaintId` VARCHAR(191) NOT NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` VARCHAR(191) NULL,
    `adminNotes` TEXT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReopenRequest_complaintId_idx`(`complaintId`),
    INDEX `ReopenRequest_status_idx`(`status`),
    INDEX `ReopenRequest_requestedAt_idx`(`requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `complaintId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `action` ENUM('CREATE_COMPLAINT', 'UPDATE_COMPLAINT', 'ASSIGN_PIC', 'SAVE_PROGRESS', 'SUBMIT_VERIFICATION', 'VERIFY_APPROVED', 'VERIFY_REJECTED', 'REQUEST_REOPEN', 'APPROVE_REOPEN', 'REJECT_REOPEN', 'GENERATE_DOCUMENT', 'REVISE_DOCUMENT', 'DELETE_COMPLAINT') NOT NULL,
    `entity` VARCHAR(191) NOT NULL DEFAULT 'Complaint',
    `entityId` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_complaintId_createdAt_idx`(`complaintId`, `createdAt`),
    INDEX `AuditLog_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Complaint_status_idx` ON `Complaint`(`status`);

-- CreateIndex
CREATE INDEX `Complaint_createdAt_idx` ON `Complaint`(`createdAt`);

-- CreateIndex
CREATE INDEX `Complaint_category_idx` ON `Complaint`(`category`);

-- CreateIndex
CREATE INDEX `Complaint_status_picId_idx` ON `Complaint`(`status`, `picId`);

-- CreateIndex
CREATE INDEX `Document_documentNumber_idx` ON `Document`(`documentNumber`);

-- CreateIndex
CREATE INDEX `Document_status_idx` ON `Document`(`status`);

-- CreateIndex
CREATE INDEX `Document_createdAt_idx` ON `Document`(`createdAt`);

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);

-- CreateIndex
CREATE INDEX `Verification_complaintId_verifiedAt_idx` ON `Verification`(`complaintId`, `verifiedAt`);

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_slaPolicyId_fkey` FOREIGN KEY (`slaPolicyId`) REFERENCES `SlaPolicy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReopenRequest` ADD CONSTRAINT `ReopenRequest_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReopenRequest` ADD CONSTRAINT `ReopenRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReopenRequest` ADD CONSTRAINT `ReopenRequest_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_parentDocumentId_fkey` FOREIGN KEY (`parentDocumentId`) REFERENCES `Document`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
