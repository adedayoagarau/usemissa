import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import {
  buildFunnelQuery,
  createChartNote,
  createMetricShare,
  listChartNotes,
  normalizeSitePath,
  parseUserAgent,
  periodFor,
  purgeSiteObservability,
  readGrowthMetrics,
  readMetricShare,
  readMonthlyMetrics,
  readSiteFunnels,
  readSiteHealth,
  readSiteTraffic,
  readUptimeFailureStreak,
  recordSiteHit,
  recordUptimeCheck,
  revokeMetricShare,
  upsertAlertState,
} from "../src/siteObservability.js";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

test("user agents are classified and bots are rejected", () => {
  assert.deepEqual(parseUserAgent(CHROME), { bot: false, device: "desktop", browser: "Chrome", os: "macOS" });
  assert.deepEqual(parseUserAgent(IPHONE), { bot: false, device: "mobile", browser: "Safari", os: "iOS" });
  assert.equal(parseUserAgent("Googlebot/2.1 (+http://www.google.com/bot.html)").bot, true);
  assert.equal(parseUserAgent("Mozilla/5.0 HeadlessChrome/120").bot, true);
  assert.equal(parseUserAgent("").bot, true);
});

test("paths drop query strings and collapse record ids", () => {
  assert.equal(normalizeSitePath("/opportunities/poetry-prize?ref=x#top"), "/opportunities/poetry-prize");
  assert.equal(normalizeSitePath("/library/2f1c3b4a-1111-2222-3333-444455556666/edit"), "/library/:id/edit");
  assert.equal(normalizeSitePath("/orders/123456"), "/orders/:id");
  assert.equal(normalizeSitePath("/settings/"), "/settings");
  assert.equal(normalizeSitePath(""), "/");
});

test("funnel queries are ordered and fully parameterised", () => {
  const { current } = periodFor(7, new Date("2026-10-03T00:00:00Z"));
  const query = buildFunnelQuery({ key: "k", label: "K", description: "", steps: [
    { label: "Visit", match: { type: "any-pageview" } },
    { label: "Sign-up page", match: { type: "page", path: "/signup", prefix: true } },
    { label: "Signed up", match: { type: "goal", name: "signup'; drop table x; --" } },
  ] }, current);
  assert.match(query.sql, /s1 as .*b\.occurred_at >= p\.at/su);
  assert.equal(query.sql.includes("drop table"), false);
  assert.deepEqual(query.params.slice(2), ["/signup%", "signup'; drop table x; --"]);
});

const databaseUrl = process.env.SITE_OBSERVABILITY_DATABASE_URL;

test("site observability round-trips against Postgres", { skip: !databaseUrl }, async () => {
  const url = databaseUrl!;
  const pool = new Pool({ connectionString: url });
  await pool.query("delete from site_events; delete from site_traffic_salts; delete from site_uptime_checks; delete from site_alerts; delete from admin_chart_notes; delete from public_metric_shares");
  await pool.query("delete from platform_analytics_events where source = 'site-observability-test'");
  await pool.query("delete from radar_accounts where id like 'acct_sotest_%'");

  const now = new Date("2026-10-03T12:00:00Z");
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000);
  const hit = (ip: string, ua: string, path: string, minutesAgo: number, extra: Partial<Parameters<typeof recordSiteHit>[0]> = {}) =>
    recordSiteHit({ connectionString: url, kind: "pageview", name: "pageview", path, host: "usemissa.com", ip, userAgent: ua, now: at(minutesAgo), ...extra });

  // Visitor A: lands from Google, views 3 pages, signs up.
  await hit("1.1.1.1", CHROME, "/", 120, { referrerHost: "google.com", country: "NG" });
  await hit("1.1.1.1", CHROME, "/opportunities", 118);
  await hit("1.1.1.1", CHROME, "/signup", 115);
  await recordSiteHit({ connectionString: url, kind: "goal", name: "signup", path: "/signup", host: "usemissa.com", ip: "1.1.1.1", userAgent: CHROME, now: at(114) });
  // Visitor B: one page from Twitter campaign, bounces.
  await hit("2.2.2.2", IPHONE, "/", 60, { utmSource: "twitter", utmCampaign: "launch", country: "GB" });
  // Visitor C: two separate sessions (gap > 30 min).
  await hit("3.3.3.3", CHROME, "/about", 200);
  await hit("3.3.3.3", CHROME, "/", 100);
  // Ignored: bot and admin path.
  assert.equal(await hit("4.4.4.4", "Googlebot/2.1", "/", 10), false);
  assert.equal(await hit("5.5.5.5", CHROME, "/admin/data", 10), false);
  // Live visitor and vitals/errors.
  await hit("6.6.6.6", CHROME, "/opportunities", 2);
  for (const value of [1200, 1800, 5200]) await recordSiteHit({ connectionString: url, kind: "vital", name: "LCP", path: "/opportunities", host: "usemissa.com", ip: "6.6.6.6", userAgent: CHROME, value, now: at(2) });
  await recordSiteHit({ connectionString: url, kind: "error", name: "client-error", path: "/opportunities", host: "usemissa.com", ip: "6.6.6.6", userAgent: CHROME, detail: "TypeError: x is undefined", now: at(1) });

  const traffic = await readSiteTraffic(url, { days: 1, now });
  assert.equal(traffic.available, true);
  assert.equal(traffic.current.visitors, 4);
  assert.equal(traffic.current.pageviews, 7);
  assert.equal(traffic.current.visits, 5);
  assert.equal(traffic.current.bounceRate, 4 / 5);
  assert.equal(traffic.live, 1);
  assert.equal(traffic.sources.find((row) => row.label === "twitter")?.visits, 1);
  assert.equal(traffic.referrers.find((row) => row.label === "google.com")?.visitors, 1);
  assert.equal(traffic.devices.find((row) => row.label === "mobile")?.visitors, 1);
  assert.equal(traffic.goals[0]?.name, "signup");
  assert.equal(traffic.goals[0]?.conversionRate, 1 / 4);
  assert.equal(traffic.daily.length, 2);

  // The goal inherited the landing referrer.
  const goal = (await pool.query("select referrer_host from site_events where kind = 'goal'")).rows[0];
  assert.equal(goal.referrer_host, "google.com");
  // No raw IPs or user agents are stored.
  const leaked = (await pool.query("select count(*)::int as n from site_events where visitor_hash like '%1.1.1.1%' or detail like '%Mozilla%'")).rows[0];
  assert.equal(leaked.n, 0);

  const funnels = await readSiteFunnels(url, [{ key: "signup", label: "Sign-up", description: "", steps: [
    { label: "Visited", match: { type: "any-pageview" } },
    { label: "Opened sign-up", match: { type: "page", path: "/signup" } },
    { label: "Signed up", match: { type: "goal", name: "signup" } },
  ] }], { days: 1, now });
  assert.deepEqual(funnels.funnels[0]?.steps.map((step) => step.visitors), [4, 1, 1]);
  assert.equal(funnels.funnels[0]?.steps[1]?.conversionFromPrevious, 1 / 4);

  // Growth over seeded accounts and events.
  await pool.query(`insert into radar_accounts (id, email, data, created_at) values
    ('acct_sotest_1', 'one@example.test', '{}', $1), ('acct_sotest_2', 'two@example.test', '{}', $2), ('acct_sotest_3', 'three@example.test', '{}', $3)`,
  [at(60 * 24 * 20).toISOString(), at(60 * 24 * 3).toISOString(), at(60).toISOString()]);
  await pool.query(`insert into platform_analytics_events (id, event_name, source, account_id, properties, occurred_at) values
    ('evt_so_1', 'auth.signup_succeeded', 'site-observability-test', 'acct_sotest_3', '{"method":"neon-auth"}', $1),
    ('evt_so_2', 'discovery.opportunity_saved', 'site-observability-test', 'acct_sotest_3', '{}', $2),
    ('evt_so_3', 'page_view', 'site-observability-test', 'acct_sotest_1', '{}', $3),
    ('evt_so_4', 'page_view', 'site-observability-test', 'acct_sotest_1', '{}', $4)`,
  [at(60).toISOString(), at(30).toISOString(), at(60 * 24 * 20).toISOString(), at(60 * 24 * 6).toISOString()]);
  const growth = await readGrowthMetrics(url, { days: 7, now });
  assert.equal(growth.available, true);
  assert.ok(growth.totals.accounts >= 3);
  assert.equal(growth.totals.signupsCurrent >= 2, true);
  assert.equal(growth.signupMethods.find((row) => row.label === "neon-auth")?.visitors, 1);
  assert.equal(growth.signupSources.find((row) => row.label === "google.com")?.visitors, 1);
  assert.ok(growth.activation.activated >= 1);
  assert.equal(growth.signupsDaily.at(-1)?.cumulative, growth.totals.accounts);
  const cohort = growth.retention.find((row) => row.cohortWeek === "2026-09-07");
  assert.ok(cohort, "cohort for the account created 20 days ago");
  assert.ok((cohort.weeks[0] ?? 0) > 0);

  const monthly = await readMonthlyMetrics(url, { months: 3, now });
  assert.equal(monthly.rows.length, 3);
  assert.equal(monthly.rows.at(-1)?.month, "2026-10");
  assert.equal(monthly.rows.at(-1)?.visitors, 4);

  // Health: uptime, vitals, errors.
  await recordUptimeCheck(url, { target: "home", url: "https://usemissa.com/", ok: true, status: 200, latencyMs: 120, at: at(20) });
  await recordUptimeCheck(url, { target: "home", url: "https://usemissa.com/", ok: false, status: 503, latencyMs: 900, error: "Service unavailable", at: at(10) });
  await recordUptimeCheck(url, { target: "home", url: "https://usemissa.com/", ok: false, status: 503, latencyMs: 900, at: at(5) });
  assert.equal(await readUptimeFailureStreak(url, "home"), 2);
  const health = await readSiteHealth(url, { days: 1, now });
  const home = health.uptime.find((row) => row.target === "home");
  assert.equal(home?.uptime24h, 1 / 3);
  assert.equal(home?.last?.ok, false);
  assert.equal(health.incidents.length, 2);
  const lcp = health.vitals.find((vital) => vital.name === "LCP");
  assert.equal(lcp?.samples, 3);
  assert.equal(lcp?.goodShare, 2 / 3);
  assert.equal(health.errors.total, 1);
  assert.equal(health.errors.top[0]?.message, "TypeError: x is undefined");

  // Alerts only report transitions.
  assert.equal((await upsertAlertState(url, { key: "uptime:home", firing: true, title: "Home is down", detail: "503", now })).transition, "fired");
  assert.equal((await upsertAlertState(url, { key: "uptime:home", firing: true, title: "Home is down", detail: "503", now })).transition, "unchanged");
  assert.equal((await upsertAlertState(url, { key: "uptime:home", firing: false, title: "Home is down", detail: "ok", now })).transition, "resolved");
  assert.equal((await upsertAlertState(url, { key: "uptime:home", firing: false, title: "Home is down", detail: "ok", now })).transition, "unchanged");

  // Notes and shares.
  await createChartNote(url, { day: "2026-10-01", label: "Product Hunt launch" });
  assert.equal((await listChartNotes(url, { from: "2026-09-01" }))[0]?.label, "Product Hunt launch");
  const share = await createMetricShare(url, { title: "Missa in numbers", metrics: ["total-users", "total-users", "visitors"] });
  assert.deepEqual((await readMetricShare(url, share.token))?.metrics, ["total-users", "visitors"]);
  assert.equal(await revokeMetricShare(url, share.token), true);
  assert.equal(await readMetricShare(url, share.token), undefined);

  // Purge keeps today's salt and drops old ones.
  await pool.query("insert into site_traffic_salts (day, salt) values ('2026-09-01', 'old')");
  const purged = await purgeSiteObservability(url, now);
  assert.equal(purged.salts, 1);

  await pool.end();
});
