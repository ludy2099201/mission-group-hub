CREATE TABLE `eventRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`personId` int NOT NULL,
	`status` enum('registered','waitlisted','cancelled') NOT NULL DEFAULT 'registered',
	`checkedInAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventRegistration_event_person_unique` UNIQUE(`eventId`,`personId`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `capacity` int;--> statement-breakpoint
ALTER TABLE `eventRegistrations` ADD CONSTRAINT `eventRegistrations_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventRegistrations` ADD CONSTRAINT `eventRegistrations_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `eventRegistration_event_status_idx` ON `eventRegistrations` (`eventId`,`status`);