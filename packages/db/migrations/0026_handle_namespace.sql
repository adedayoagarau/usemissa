-- Phase 0: reserve the shared handle namespace without publishing any profile.
CREATE TABLE IF NOT EXISTS "handles" (
  "handle_key" text PRIMARY KEY NOT NULL,
  "display_handle" text NOT NULL,
  "subject_type" text NOT NULL,
  "subject_id" text NOT NULL,
  "state" text NOT NULL,
  "derivation" text NOT NULL,
  "reserved_from_profile_id" text REFERENCES "gary_profiles"("id") ON DELETE SET NULL,
  "claimed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "handles_subject_type_check" CHECK ("subject_type" in ('user', 'organization', 'directory_profile')),
  CONSTRAINT "handles_state_check" CHECK ("state" in ('claimed', 'reserved', 'blocked')),
  CONSTRAINT "handles_derivation_check" CHECK ("derivation" in ('user-chosen', 'name', 'domain', 'both', 'manual'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "handles_subject_active_idx"
  ON "handles" USING btree ("subject_type", "subject_id")
  WHERE "state" <> 'blocked';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handles_subject_idx"
  ON "handles" USING btree ("subject_type", "subject_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handles_reserved_profile_idx"
  ON "handles" USING btree ("reserved_from_profile_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "handle_aliases" (
  "alias_key" text PRIMARY KEY NOT NULL,
  "handle_key" text NOT NULL REFERENCES "handles"("handle_key") ON DELETE CASCADE,
  "reason" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "handle_aliases_reason_check" CHECK ("reason" in ('article-variant', 'rename', 'domain-variant', 'manual'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handle_aliases_handle_idx"
  ON "handle_aliases" USING btree ("handle_key");
--> statement-breakpoint
-- Blocked rows have no real subject. The sentinel subject_id is internal only;
-- state=blocked is excluded from the active subject uniqueness constraint.
INSERT INTO "handles" (
  "handle_key",
  "display_handle",
  "subject_type",
  "subject_id",
  "state",
  "derivation"
)
SELECT word, word, 'user', 'blocked:' || word, 'blocked', 'manual'
FROM unnest(ARRAY[
  'about',
  'admin',
  'api',
  'ask',
  'calendar',
  'design-system',
  'discover',
  'for-organizations',
  'guides',
  'help',
  'home',
  'inbox',
  'import',
  'insights',
  'journals',
  'legal',
  'library',
  'login',
  'mail',
  'messages',
  'methodology',
  'missa',
  'my-submissions',
  'opportunities',
  'opportunities-preview',
  'org',
  'organization',
  'privacy',
  'profile',
  'publication-claim',
  'reviewer',
  'reviews',
  'security',
  'settings',
  'signup',
  'staff',
  'status',
  'submissions',
  'support',
  'team',
  'terms',
  'tracker',
  'waitlist',
  'missa-public-profile',
  'www',
  'blog',
  'moderator',
  'official'
]::text[]) AS reserved(word)
ON CONFLICT ("handle_key") DO NOTHING;
