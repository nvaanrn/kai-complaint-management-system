-- Satu keluhan bisa ditolak Verifikator berkali-kali, sehingga bisa punya banyak perpanjangan SLA.
-- Batasan unik pada complaintId dilepas (diganti index biasa), dan satuan tambahan waktu menjadi HARI kerja.

ALTER TABLE `SlaExtension` DROP FOREIGN KEY `SlaExtension_complaintId_fkey`;

DROP INDEX `SlaExtension_complaintId_key` ON `SlaExtension`;

CREATE INDEX `SlaExtension_complaintId_idx` ON `SlaExtension`(`complaintId`);

ALTER TABLE `SlaExtension` ADD CONSTRAINT `SlaExtension_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SlaExtension` CHANGE `extraWorkingHours` `extraWorkingDays` INTEGER NOT NULL;
