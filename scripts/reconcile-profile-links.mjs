import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("1. Reconciling verified organization profile links...");
  const insertRes = await pool.query(`
    insert into opportunity_profile_links
      (id, opportunity_id, profile_id, relation, status, confidence, matched_host,
       opportunity_url, profile_url, name_score, matched_name_tokens, evidence_json,
       profile_checked_at, opportunity_checked_at, verified_at, verified_until)
    select
      md5(o.id || ':' || p.id || ':host'),
      o.id,
      p.id,
      'host',
      'confirmed',
      0.99,
      coalesce(substring(coalesce(p.website_url, s.url, o.guidelines_url) from '://([^/]+)'), ''),
      coalesce(o.submission_url, o.guidelines_url, s.url, p.website_url, 'https://usemissa.com'),
      coalesce(p.website_url, s.url, o.guidelines_url, o.submission_url, 'https://usemissa.com'),
      1.0,
      array[p.name],
      jsonb_build_object('rule', 'canonical-org-identity', 'matcherVersion', 'profile-host-name-v4'),
      p.last_seen_at,
      o.source_checked_at,
      now(),
      now() + interval '90 days'
    from opportunities o
    join gary_profiles p on p.id = o.organization_id
    left join opportunity_sources s on s.id = o.source_id
    on conflict (profile_id, opportunity_id, relation) do update set
      status = 'confirmed',
      confidence = 0.99,
      name_score = 1.0,
      verified_at = now(),
      verified_until = now() + interval '90 days',
      updated_at = now()
    where opportunity_profile_links.status <> 'confirmed'
  `);
  console.log("Upserted confirmed links:", insertRes.rowCount);

  console.log("2. Purging spurious 0-score pending links on multi-tenant platforms...");
  const purgeRes = await pool.query(`
    delete from opportunity_profile_links l
    using opportunities o
    where o.id = l.opportunity_id
      and l.status = 'pending'
      and l.name_score = 0
      and l.matched_host in ('artconnect.com', 'resartis.org', 'curatorspace.com')
      and (o.organization_id is null or o.organization_id <> l.profile_id)
  `);
  console.log("Purged spurious links:", purgeRes.rowCount);

  const finalStats = await pool.query(`
    select status, count(*) from opportunity_profile_links group by status
  `);
  console.log("Final link counts by status:", finalStats.rows);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
