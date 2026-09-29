CREATE TABLE "instagram_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_url" text NOT NULL,
	"storage_key" text NOT NULL,
	"widths" integer[] NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"blur_data_url" text,
	"alt" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instagram_posts_url_format" CHECK ("instagram_posts"."post_url" ~ '^https://www.instagram.com/')
);
--> statement-breakpoint
CREATE INDEX "instagram_posts_position_idx" ON "instagram_posts" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_posts_storage_key_key" ON "instagram_posts" USING btree ("storage_key");