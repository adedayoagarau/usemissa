ALTER TABLE "profile_materials" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "profile_materials" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "profile_materials" ADD COLUMN "size_bytes" integer;--> statement-breakpoint
ALTER TABLE "profile_materials" ADD CONSTRAINT "profile_materials_size_check" CHECK ("profile_materials"."size_bytes" is null or "profile_materials"."size_bytes" >= 0);