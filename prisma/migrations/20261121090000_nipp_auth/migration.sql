-- Tahap A: login NIPP. Kolom nipp dibuat nullable dulu, diisi, lalu diwajibkan dan dibuat unik.
-- Kolom email TIDAK dihapus di sini (dihapus di migrasi Tahap B setelah login NIPP terbukti jalan).

ALTER TABLE `User`
    ADD COLUMN `nipp` VARCHAR(191) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lockedUntil` DATETIME(3) NULL,
    MODIFY `email` VARCHAR(191) NULL;

-- Isi NIPP untuk tiga user yang ada (dicocokkan lewat email seed).
UPDATE `User` SET `nipp` = '9987459001' WHERE `email` = 'admin@spkp.kai.id';
UPDATE `User` SET `nipp` = '9987459002' WHERE `email` = 'pic@spkp.kai.id';
UPDATE `User` SET `nipp` = '9987459003' WHERE `email` = 'verifikator@spkp.kai.id';

-- Pengaman: user lain tanpa NIPP diberi NIPP sementara agar migrasi tidak gagal.
-- (Cek di phpMyAdmin dan ganti dengan NIPP yang benar.)
UPDATE `User` SET `nipp` = CONCAT('9900', LPAD(CAST(CONV(SUBSTRING(MD5(`id`), 1, 6), 16, 10) AS CHAR), 8, '0'))
WHERE `nipp` IS NULL;

ALTER TABLE `User`
    MODIFY `nipp` VARCHAR(191) NOT NULL,
    ADD UNIQUE INDEX `User_nipp_key`(`nipp`);
