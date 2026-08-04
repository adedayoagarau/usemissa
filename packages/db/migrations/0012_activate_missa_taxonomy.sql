-- Publish the reviewed v1 creative-practice scheme for Passport and Workspace.
-- Safe on a database that has not yet run 0011: the update simply affects zero rows.
update taxonomy_schemes
set status = 'active',
    published_at = coalesce(published_at, now()),
    updated_at = now()
where key = 'missa-creative-practice'
  and status = 'draft';
