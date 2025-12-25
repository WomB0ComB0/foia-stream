-- Copyright (c) 2025 Foia Stream
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in all
-- copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.

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