-- Expand organization seats beyond the original member/admin MVP. Existing
-- memberships remain valid and the JSON payload remains the source of truth.
alter table "radar_memberships" drop constraint if exists "radar_memberships_role_check";
alter table "radar_memberships" add constraint "radar_memberships_role_check"
  check ("role" in ('member', 'admin', 'owner', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest'));
