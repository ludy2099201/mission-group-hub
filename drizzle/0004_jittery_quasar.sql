CREATE TABLE `households` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`primaryPhone` varchar(64),
	`notes` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `households_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(120) NOT NULL,
	`email` varchar(320),
	`phone` varchar(64),
	`householdId` int,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `people_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `groupMembers` ADD `personId` int;--> statement-breakpoint
ALTER TABLE `people` ADD CONSTRAINT `people_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `households_status_idx` ON `households` (`status`);--> statement-breakpoint
CREATE INDEX `people_name_idx` ON `people` (`fullName`);--> statement-breakpoint
CREATE INDEX `people_email_idx` ON `people` (`email`);--> statement-breakpoint
CREATE INDEX `people_phone_idx` ON `people` (`phone`);--> statement-breakpoint
CREATE INDEX `people_household_idx` ON `people` (`householdId`);--> statement-breakpoint
ALTER TABLE `groupMembers` ADD CONSTRAINT `groupMembers_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `groupMembers_person_idx` ON `groupMembers` (`personId`);