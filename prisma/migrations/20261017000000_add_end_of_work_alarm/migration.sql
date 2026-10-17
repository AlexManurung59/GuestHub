CREATE TABLE `end_of_work_alarm` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `alarm_date` VARCHAR(10) NULL,
    `dismissed_date` VARCHAR(10) NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
