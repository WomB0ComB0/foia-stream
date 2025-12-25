CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_preview` text NOT NULL,
	`name` text DEFAULT 'Default' NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `consent_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`consent_type` text NOT NULL,
	`action` text NOT NULL,
	`policy_version` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `foia_requests` ADD `content_purge_at` text;--> statement-breakpoint
ALTER TABLE `foia_requests` ADD `content_purged` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `foia_requests` ADD `title_hash` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `ip_address` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `user_agent` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `device_name` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `last_active_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `failed_login_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `locked_until` text;--> statement-breakpoint
ALTER TABLE `users` ADD `last_failed_login_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password_changed_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `must_change_password` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `terms_accepted_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `privacy_accepted_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `data_processing_consent_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `marketing_consent_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `consent_updated_at` text;