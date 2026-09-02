-- Expand gary_profiles profile_kind check constraint to support visual arts organizations, galleries, residency centers, and foundations

ALTER TABLE "gary_profiles" DROP CONSTRAINT IF EXISTS "gary_profiles_kind_check";
ALTER TABLE "gary_profiles" ADD CONSTRAINT "gary_profiles_kind_check" 
  CHECK ("profile_kind" in ('literary_magazine', 'small_press', 'visual_arts_organization', 'gallery', 'residency_center', 'grant_foundation', 'organization'));
