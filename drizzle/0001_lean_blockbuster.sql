CREATE TABLE `announcementGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcementId` int NOT NULL,
	`groupId` int NOT NULL,
	CONSTRAINT `announcementGroups_id` PRIMARY KEY(`id`),
	CONSTRAINT `announcement_group_unique` UNIQUE(`announcementId`,`groupId`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`isPublished` boolean NOT NULL DEFAULT true,
	`publishedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendanceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`groupMemberId` int NOT NULL,
	`status` enum('attended','absent','excused') NOT NULL DEFAULT 'attended',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendanceRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_meeting_member_unique` UNIQUE(`meetingId`,`groupMemberId`)
);
--> statement-breakpoint
CREATE TABLE `careLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupMemberId` int NOT NULL,
	`createdBy` int NOT NULL,
	`careDate` timestamp NOT NULL,
	`method` enum('phone','visit','message','meeting','other') NOT NULL,
	`summary` text NOT NULL,
	`followUpStatus` enum('none','pending','completed') NOT NULL DEFAULT 'none',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `careLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`groupId` int NOT NULL,
	CONSTRAINT `eventGroups_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_group_unique` UNIQUE(`eventId`,`groupId`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`location` varchar(180),
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`isPublished` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groupMeetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`heldAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groupMeetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groupMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(320),
	`phone` varchar(64),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groupMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`district` varchar(120) NOT NULL,
	`leaderUserId` int,
	`description` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `missionaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`ministryRegion` varchar(180) NOT NULL,
	`sendingOrganization` varchar(180) NOT NULL,
	`contactEmail` varchar(320),
	`contactPhone` varchar(64),
	`photoUrl` varchar(1024),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `missionaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prayerRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`missionaryId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`status` enum('praying','answered') NOT NULL DEFAULT 'praying',
	`isArchived` boolean NOT NULL DEFAULT false,
	`answeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prayerRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportCommitments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`missionaryId` int NOT NULL,
	`supporterId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'TWD',
	`frequency` enum('monthly','quarterly','yearly','one_time') NOT NULL DEFAULT 'monthly',
	`status` enum('active','paused','ended') NOT NULL DEFAULT 'active',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supportCommitments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supporters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(320),
	`phone` varchar(64),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supporters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(16) NOT NULL DEFAULT 'Member';--> statement-breakpoint
UPDATE `users` SET `role` = CASE WHEN `role` = 'admin' THEN 'Admin' WHEN `role` = 'user' THEN 'Member' ELSE `role` END;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('Admin','Leader','Member') NOT NULL DEFAULT 'Member';--> statement-breakpoint
ALTER TABLE `announcementGroups` ADD CONSTRAINT `announcementGroups_announcementId_announcements_id_fk` FOREIGN KEY (`announcementId`) REFERENCES `announcements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcementGroups` ADD CONSTRAINT `announcementGroups_groupId_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_meetingId_groupMeetings_id_fk` FOREIGN KEY (`meetingId`) REFERENCES `groupMeetings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_groupMemberId_groupMembers_id_fk` FOREIGN KEY (`groupMemberId`) REFERENCES `groupMembers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `careLogs` ADD CONSTRAINT `careLogs_groupMemberId_groupMembers_id_fk` FOREIGN KEY (`groupMemberId`) REFERENCES `groupMembers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `careLogs` ADD CONSTRAINT `careLogs_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventGroups` ADD CONSTRAINT `eventGroups_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventGroups` ADD CONSTRAINT `eventGroups_groupId_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `groupMeetings` ADD CONSTRAINT `groupMeetings_groupId_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `groupMembers` ADD CONSTRAINT `groupMembers_groupId_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `groups` ADD CONSTRAINT `groups_leaderUserId_users_id_fk` FOREIGN KEY (`leaderUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prayerRequests` ADD CONSTRAINT `prayerRequests_missionaryId_missionaries_id_fk` FOREIGN KEY (`missionaryId`) REFERENCES `missionaries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportCommitments` ADD CONSTRAINT `supportCommitments_missionaryId_missionaries_id_fk` FOREIGN KEY (`missionaryId`) REFERENCES `missionaries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportCommitments` ADD CONSTRAINT `supportCommitments_supporterId_supporters_id_fk` FOREIGN KEY (`supporterId`) REFERENCES `supporters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_meeting_idx` ON `attendanceRecords` (`meetingId`);--> statement-breakpoint
CREATE INDEX `careLogs_member_idx` ON `careLogs` (`groupMemberId`);--> statement-breakpoint
CREATE INDEX `events_startsAt_idx` ON `events` (`startsAt`);--> statement-breakpoint
CREATE INDEX `groupMeetings_group_idx` ON `groupMeetings` (`groupId`);--> statement-breakpoint
CREATE INDEX `groupMembers_group_idx` ON `groupMembers` (`groupId`);--> statement-breakpoint
CREATE INDEX `groups_leader_idx` ON `groups` (`leaderUserId`);--> statement-breakpoint
CREATE INDEX `prayerRequests_missionary_idx` ON `prayerRequests` (`missionaryId`);--> statement-breakpoint
CREATE INDEX `supportCommitments_missionary_idx` ON `supportCommitments` (`missionaryId`);--> statement-breakpoint
CREATE INDEX `supportCommitments_supporter_idx` ON `supportCommitments` (`supporterId`);
