-- Tahap B: hapus kolom email (login memakai NIPP). Index unik email ikut terhapus otomatis.
ALTER TABLE `User` DROP COLUMN `email`;
