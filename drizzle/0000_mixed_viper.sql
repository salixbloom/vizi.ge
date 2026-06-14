CREATE TABLE `devices` (
	`device_id` text PRIMARY KEY NOT NULL,
	`first_seen` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`last_seen` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`submission_count` integer DEFAULT 0 NOT NULL,
	`blocked` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`label` text,
	`description` text,
	`status` text DEFAULT 'approved' NOT NULL,
	`first_seen` text,
	`current_image_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `locations_bbox_idx` ON `locations` (`lat`,`lng`);--> statement-breakpoint
CREATE INDEX `locations_status_idx` ON `locations` (`status`);--> statement-breakpoint
CREATE TABLE `submission_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`submission_id` integer NOT NULL,
	`path` text NOT NULL,
	`thumb_path` text NOT NULL,
	`mime` text NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`target_location_id` integer,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`note` text,
	`device_id` text NOT NULL,
	`ip_hash` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_note` text,
	`submitted_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`decided_at` text
);
--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE INDEX `submissions_device_idx` ON `submissions` (`device_id`,`submitted_at`);