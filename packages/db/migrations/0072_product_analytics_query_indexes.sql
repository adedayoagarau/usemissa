-- Additive indexes for bounded product-analytics windows and anonymous
-- session funnels. This migration does not alter or backfill event rows.
CREATE INDEX IF NOT EXISTS "platform_analytics_events_time_idx"
  ON "platform_analytics_events" USING btree ("occurred_at");

CREATE INDEX IF NOT EXISTS "platform_analytics_events_session_time_idx"
  ON "platform_analytics_events" USING btree ("session_id", "occurred_at")
  WHERE "session_id" IS NOT NULL;
