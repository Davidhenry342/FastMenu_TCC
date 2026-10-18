-- AlterTable
ALTER TABLE `payments` MODIFY `mpPreferenceId` VARCHAR(191) NULL,
    ADD COLUMN `qrCode` TEXT NULL,
    ADD COLUMN `items` JSON NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NULL;
