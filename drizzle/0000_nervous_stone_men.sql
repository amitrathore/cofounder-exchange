CREATE TABLE `moderation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`action` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `moderation_project_idx` ON `moderation_events` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`one_liner` text DEFAULT '' NOT NULL,
	`problem` text DEFAULT '' NOT NULL,
	`solution` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'idea' NOT NULL,
	`progress` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`project_url` text DEFAULT '' NOT NULL,
	`project_location` text DEFAULT '' NOT NULL,
	`work_mode` text DEFAULT 'remote' NOT NULL,
	`current_team` text DEFAULT '' NOT NULL,
	`role_title` text DEFAULT '' NOT NULL,
	`role_description` text DEFAULT '' NOT NULL,
	`skills_needed` text DEFAULT '[]' NOT NULL,
	`experience_needed` text DEFAULT '' NOT NULL,
	`weekly_commitment` text DEFAULT '' NOT NULL,
	`relationship` text DEFAULT '' NOT NULL,
	`exchange_types` text DEFAULT '[]' NOT NULL,
	`equity_min` integer,
	`equity_max` integer,
	`offer_details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`moderation_note` text DEFAULT '' NOT NULL,
	`submitted_at` text,
	`reviewed_at` text,
	`reviewed_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `projects_owner_idx` ON `projects` (`owner_id`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'clerk' NOT NULL,
	`external_id` text NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`avatar_url` text,
	`location` text DEFAULT '' NOT NULL,
	`timezone` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_provider_external_idx` ON `users` (`provider`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);