CREATE TABLE IF NOT EXISTS `member_visits` (
	`clerk_user_id` text PRIMARY KEY NOT NULL,
	`username` text,
	`display_name` text,
	`email` text,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`visit_count` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `institutional_deals` (
	`id` text PRIMARY KEY NOT NULL,
	`hotel_id` text NOT NULL,
	`hotel_name` text NOT NULL,
	`stage` text NOT NULL,
	`model_json` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`owner_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deal_events` (
	`id` text PRIMARY KEY NOT NULL,
	`deal_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`stage` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `institutional_deals_updated_idx` ON `institutional_deals` (`updated_at` DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `deal_events_deal_idx` ON `deal_events` (`deal_id`,`created_at` DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deal_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`deal_id` text NOT NULL,
	`uploader_user_id` text NOT NULL,
	`uploader_name` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`r2_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `deal_documents_deal_idx` ON `deal_documents` (`deal_id`,`created_at` DESC);
