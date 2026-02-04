CREATE TABLE `album_media` (
	`album_id` text NOT NULL,
	`media_id` text NOT NULL,
	`display_order` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `album_otps` (
	`id` text PRIMARY KEY NOT NULL,
	`album_id` text NOT NULL,
	`token` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `album_tags` (
	`album_id` text NOT NULL,
	`tag` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`cover_media_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`media_count` integer,
	`view_count` integer,
	`slug` text,
	`password` text,
	`status` text
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`comment_ID` text PRIMARY KEY NOT NULL,
	`comment_post_ID` text,
	`comment_author_name` text,
	`comment_author_email` text,
	`comment_author_url` text,
	`comment_author_ip` text,
	`comment_date` text,
	`comment_content` text,
	`comment_parent` text,
	`comment_likes` integer,
	`comment_dislikes` integer,
	`comment_status` text,
	`comment_type` text
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`object_key` text NOT NULL,
	`url` text NOT NULL,
	`url_thumb` text,
	`url_medium` text,
	`url_large` text,
	`filename` text,
	`mime` text,
	`size` integer,
	`width` integer,
	`height` integer,
	`title` text,
	`alt` text,
	`exif_json` text,
	`camera_make` text,
	`camera_model` text,
	`lens_model` text,
	`aperture` text,
	`shutter_speed` text,
	`iso` text,
	`focal_length` text,
	`datetime_original` text,
	`gps_lat` real,
	`gps_lon` real,
	`location_name` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`likes` integer,
	`visibility` text
);
--> statement-breakpoint
CREATE TABLE `media_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`display_order` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_category_links` (
	`media_id` text NOT NULL,
	`category_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_tags` (
	`media_id` text NOT NULL,
	`tag` text NOT NULL
);
