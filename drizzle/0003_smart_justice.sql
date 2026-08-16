CREATE TABLE `pastoralTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('care_followup','prayer_followup','attendance_followup','general') NOT NULL DEFAULT 'general',
	`title` varchar(180) NOT NULL,
	`detail` text,
	`assignedToUserId` int NOT NULL,
	`dueAt` timestamp,
	`priority` enum('low','normal','high') NOT NULL DEFAULT 'normal',
	`status` enum('open','completed','dismissed') NOT NULL DEFAULT 'open',
	`completedAt` timestamp,
	`groupId` int,
	`groupMemberId` int,
	`missionaryId` int,
	`prayerRequestId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pastoralTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pastoralTasks` ADD CONSTRAINT `pastoralTasks_assignedToUserId_users_id_fk` FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pastoralTasks` ADD CONSTRAINT `pastoralTasks_groupId_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pastoralTasks` ADD CONSTRAINT `pastoralTasks_groupMemberId_groupMembers_id_fk` FOREIGN KEY (`groupMemberId`) REFERENCES `groupMembers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pastoralTasks` ADD CONSTRAINT `pastoralTasks_missionaryId_missionaries_id_fk` FOREIGN KEY (`missionaryId`) REFERENCES `missionaries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pastoralTasks` ADD CONSTRAINT `pastoralTasks_prayerRequestId_prayerRequests_id_fk` FOREIGN KEY (`prayerRequestId`) REFERENCES `prayerRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pastoralTasks` ADD CONSTRAINT `pastoralTasks_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pastoralTasks_assignee_status_idx` ON `pastoralTasks` (`assignedToUserId`,`status`);--> statement-breakpoint
CREATE INDEX `pastoralTasks_due_idx` ON `pastoralTasks` (`dueAt`);--> statement-breakpoint
CREATE INDEX `pastoralTasks_group_idx` ON `pastoralTasks` (`groupId`);