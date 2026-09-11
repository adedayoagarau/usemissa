import { NextResponse } from 'next/server';
import pg from 'pg';
import { requirePlatformAdmin, platformAdminAuthResponse } from '@/lib/platformAdmin';

const { Pool } = pg;
let poolInstance: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return poolInstance;
}

const headers = { 'cache-control': 'private, no-store' };

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get('opportunityId');
  const profileId = searchParams.get('profileId');

  if (!opportunityId && !profileId) {
    return NextResponse.json({ error: 'opportunityId or profileId required' }, { status: 400, headers });
  }

  try {
    const pool = getPool();
    let targetOppId = opportunityId;

    if (!targetOppId && profileId) {
      const linkRes = await pool.query(
        'SELECT opportunity_id FROM opportunity_profile_links WHERE profile_id = $1 LIMIT 1',
        [profileId]
      );
      if (linkRes.rows.length > 0) {
        targetOppId = linkRes.rows[0].opportunity_id;
      }
    }

    if (!targetOppId) {
      return NextResponse.json({ windows: [], profile: null }, { headers });
    }

    const [windowsRes, profileRes] = await Promise.all([
      pool.query(
        `SELECT id, opportunity_id, label, opens_at::text, closes_at::text, kind, timezone, current, source_url, confidence, created_at, updated_at
         FROM opportunity_call_windows
         WHERE opportunity_id = $1
         ORDER BY current DESC, opens_at ASC NULLS LAST`,
        [targetOppId]
      ),
      pool.query(
        `SELECT opportunity_id, call_kind, market_kind, reading_period_kind, reading_period_label, payment_type, reprints_allowed, previously_unpublished_required, multiple_submissions_allowed
         FROM opportunity_call_profiles
         WHERE opportunity_id = $1`,
        [targetOppId]
      ),
    ]);

    return NextResponse.json({
      opportunityId: targetOppId,
      windows: windowsRes.rows,
      callProfile: profileRes.rows[0] ?? null,
    }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load windows' }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));
    const {
      id,
      opportunityId,
      profileId,
      label,
      opensAt,
      closesAt,
      kind = 'seasonal',
      timezone = 'America/New_York',
      current = true,
      sourceUrl,
      readingPeriodKind,
      readingPeriodLabel,
    } = body;

    const pool = getPool();
    let targetOppId = opportunityId;

    if (!targetOppId && profileId) {
      const linkRes = await pool.query(
        'SELECT opportunity_id FROM opportunity_profile_links WHERE profile_id = $1 LIMIT 1',
        [profileId]
      );
      if (linkRes.rows.length > 0) {
        targetOppId = linkRes.rows[0].opportunity_id;
      }
    }

    if (!targetOppId) {
      return NextResponse.json({ error: 'opportunityId is required' }, { status: 400, headers });
    }

    const windowId = id || `win_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const finalSourceUrl = sourceUrl || 'https://usemissa.com';

    await pool.query(`
      INSERT INTO opportunity_call_windows (
        id, opportunity_id, label, opens_at, closes_at, kind, timezone, current, source_url, confidence, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, 'confirmed', now(), now()
      ) ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        opens_at = EXCLUDED.opens_at,
        closes_at = EXCLUDED.closes_at,
        kind = EXCLUDED.kind,
        timezone = EXCLUDED.timezone,
        current = EXCLUDED.current,
        source_url = EXCLUDED.source_url,
        confidence = 'confirmed',
        updated_at = now();
    `, [
      windowId,
      targetOppId,
      label || `Submission Window: ${opensAt || 'Open'} – ${closesAt || 'Rolling'}`,
      opensAt || null,
      closesAt || null,
      kind,
      timezone,
      current,
      finalSourceUrl,
    ]);

    if (readingPeriodKind || readingPeriodLabel) {
      await pool.query(`
        INSERT INTO opportunity_call_profiles (
          opportunity_id, call_kind, market_kind, reading_period_kind, reading_period_label, confidence, source_url, created_at, updated_at
        ) VALUES (
          $1, 'general-submission', 'journal', $2, $3, 'confirmed', $4, now(), now()
        ) ON CONFLICT (opportunity_id) DO UPDATE SET
          reading_period_kind = COALESCE(EXCLUDED.reading_period_kind, opportunity_call_profiles.reading_period_kind),
          reading_period_label = COALESCE(EXCLUDED.reading_period_label, opportunity_call_profiles.reading_period_label),
          confidence = 'confirmed',
          updated_at = now();
      `, [
        targetOppId,
        readingPeriodKind || kind,
        readingPeriodLabel || label,
        finalSourceUrl,
      ]);
    }

    // Also update opportunities row directly
    const todayIso = new Date().toISOString().slice(0, 10);
    const isOpen = (!opensAt || opensAt <= todayIso) && (!closesAt || closesAt >= todayIso);
    const isOpeningSoon = opensAt && opensAt > todayIso;
    const targetStatus = isOpen ? 'open' : isOpeningSoon ? 'opening-soon' : 'closed';

    await pool.query(`
      UPDATE opportunities
      SET open_date = COALESCE($2::date, open_date),
          deadline_date = $3::date,
          deadline_kind = $4,
          status = $5,
          updated_at = now()
      WHERE id = $1;
    `, [
      targetOppId,
      opensAt || null,
      closesAt || null,
      kind === 'rolling' || kind === 'year-round' ? 'rolling' : (closesAt ? 'exact' : 'unknown'),
      targetStatus,
    ]);

    return NextResponse.json({
      ok: true,
      windowId,
      status: targetStatus,
    }, { headers, status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save window' }, { status: 500, headers });
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const windowId = searchParams.get('id');

  if (!windowId) {
    return NextResponse.json({ error: 'Window id is required' }, { status: 400, headers });
  }

  try {
    const pool = getPool();
    await pool.query('DELETE FROM opportunity_call_windows WHERE id = $1', [windowId]);
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete window' }, { status: 500, headers });
  }
}
