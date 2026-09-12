-- Opportunity browse may fall back from call artwork to a confirmed
-- organization's cleared identity media. Keep that lookup bounded to the
-- organization being rendered instead of scanning every historical asset for
-- each result card.
CREATE INDEX IF NOT EXISTS opportunity_identity_assets_linked_org_public_idx
  ON opportunity_identity_assets (linked_organization_id, kind, rights_status)
  WHERE linked_organization_id IS NOT NULL;
