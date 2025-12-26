CREATE TABLE `custom_redaction_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'Custom' NOT NULL,
	`patterns` text,
	`is_shared` integer DEFAULT false NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_custom_redaction_templates_user_id` ON `custom_redaction_templates` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_custom_redaction_templates_is_shared` ON `custom_redaction_templates` (`is_shared`);--> statement-breakpoint
CREATE TABLE `document_access_log` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_type` text NOT NULL,
	`mfa_verified` integer DEFAULT false NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `secure_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_document_access_log_document_id` ON `document_access_log` (`document_id`);--> statement-breakpoint
CREATE INDEX `idx_document_access_log_user_id` ON `document_access_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_document_access_log_access_type` ON `document_access_log` (`access_type`);--> statement-breakpoint
CREATE INDEX `idx_document_access_log_created_at` ON `document_access_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `redaction_history` (
	`id` text PRIMARY KEY NOT NULL,
	`source_document_id` text NOT NULL,
	`result_document_id` text,
	`user_id` text NOT NULL,
	`template_id` text,
	`redaction_count` integer DEFAULT 0 NOT NULL,
	`redaction_areas` text,
	`patterns_matched` text,
	`is_permanent` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_document_id`) REFERENCES `secure_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`result_document_id`) REFERENCES `secure_documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_redaction_history_source_document_id` ON `redaction_history` (`source_document_id`);--> statement-breakpoint
CREATE INDEX `idx_redaction_history_user_id` ON `redaction_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_redaction_history_template_id` ON `redaction_history` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_redaction_history_created_at` ON `redaction_history` (`created_at`);--> statement-breakpoint
CREATE TABLE `secure_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`uploaded_by` text NOT NULL,
	`original_file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`sha256_hash` text NOT NULL,
	`status` text DEFAULT 'pending_scan' NOT NULL,
	`virus_scan_result` text,
	`requires_mfa` integer DEFAULT false NOT NULL,
	`access_password_hash` text,
	`is_encrypted` integer DEFAULT true NOT NULL,
	`encryption_key_id` text,
	`expires_at` text,
	`access_count` integer DEFAULT 0 NOT NULL,
	`last_accessed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_secure_documents_uploaded_by` ON `secure_documents` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `idx_secure_documents_status` ON `secure_documents` (`status`);--> statement-breakpoint
CREATE INDEX `idx_secure_documents_sha256` ON `secure_documents` (`sha256_hash`);--> statement-breakpoint
CREATE INDEX `idx_secure_documents_created_at` ON `secure_documents` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_secure_documents_expires_at` ON `secure_documents` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_agencies_jurisdiction` ON `agencies` (`jurisdiction_level`);--> statement-breakpoint
CREATE INDEX `idx_agencies_state` ON `agencies` (`state`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_user_id` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_keys_key_hash` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_appeals_request_id` ON `appeals` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_appeals_user_id` ON `appeals` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_appeals_status` ON `appeals` (`status`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_user_id` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_resource_type` ON `audit_logs` (`resource_type`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_resource_id` ON `audit_logs` (`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_user_action` ON `audit_logs` (`user_id`,`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action_created` ON `audit_logs` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_resource_type_id` ON `audit_logs` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_comment_votes_comment_id` ON `comment_votes` (`comment_id`);--> statement-breakpoint
CREATE INDEX `idx_comment_votes_user_id` ON `comment_votes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_comment_votes_user_comment` ON `comment_votes` (`user_id`,`comment_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_document_id` ON `comments` (`document_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_user_id` ON `comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_type` ON `comments` (`type`);--> statement-breakpoint
CREATE INDEX `idx_comments_created_at` ON `comments` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_documents_request_id` ON `documents` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_agency_id` ON `documents` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_uploaded_by` ON `documents` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `idx_documents_type` ON `documents` (`type`);--> statement-breakpoint
CREATE INDEX `idx_documents_is_public` ON `documents` (`is_public`);--> statement-breakpoint
CREATE INDEX `idx_documents_created_at` ON `documents` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_user_id` ON `foia_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_agency_id` ON `foia_requests` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_status` ON `foia_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_category` ON `foia_requests` (`category`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_created_at` ON `foia_requests` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_due_date` ON `foia_requests` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_is_public` ON `foia_requests` (`is_public`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_user_status` ON `foia_requests` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_agency_status` ON `foia_requests` (`agency_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_foia_requests_status_created` ON `foia_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_knowledge_articles_category` ON `knowledge_articles` (`category`);--> statement-breakpoint
CREATE INDEX `idx_knowledge_articles_state` ON `knowledge_articles` (`state`);--> statement-breakpoint
CREATE INDEX `idx_knowledge_articles_is_published` ON `knowledge_articles` (`is_published`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires_at` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_expires` ON `sessions` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_use_of_force_stats_agency_id` ON `use_of_force_stats` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_use_of_force_stats_year` ON `use_of_force_stats` (`year`);--> statement-breakpoint
CREATE INDEX `idx_use_of_force_stats_agency_year` ON `use_of_force_stats` (`agency_id`,`year`);