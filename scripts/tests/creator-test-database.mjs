import { randomUUID } from 'node:crypto';
import pg from 'pg';

/** Separate PostgreSQL schema: tests can change catalogue dates without touching public records. */
export async function creatorTestDatabase(connectionString, extraTables = []) {
  const schema = `creator_test_${randomUUID().replaceAll('-','')}`;
  const admin = new pg.Pool({ connectionString });
  await admin.query(`create schema ${schema}`);
  const tables = ['radar_accounts','opportunities','notification_preferences','tracked_opportunities','tracked_status_events',
    'creator_library_works','creator_library_files','creator_saved_answers','tracker_checklists','tracker_checklist_items',
    'application_material_versions','application_material_files','creator_application_reminders','creator_inbox_alerts',
    'programs','entities','gary_profiles','radar_organizations','opportunity_url_observations','organization_follows','creator_program_follows','creator_follow_editions','workspace_command_receipts','audit_events','outbox_events','creator_goals','creator_goal_targets','creator_goal_checkins','creator_goal_notifications'];
  try {
    for (const table of new Set([...tables, ...extraTables])) {
      if (!/^[a-z_]+$/.test(table)) throw new Error('Invalid test table');
      await admin.query(`create table ${schema}.${table} (like public.${table} including all)`);
    }
    const url = new URL(connectionString);
    if(url.hostname.endsWith('.neon.tech'))url.hostname=url.hostname.replace('-pooler.','.');
    url.searchParams.set('options', `-c search_path=${schema},public`);
    const pool = new pg.Pool({ connectionString: url.toString() });
    return { pool, connectionString: url.toString(), schema, async cleanup() { await pool.end(); await admin.query(`drop schema ${schema} cascade`); await admin.end(); } };
  } catch (e) { await admin.query(`drop schema ${schema} cascade`); await admin.end(); throw e; }
}
