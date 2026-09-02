import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ProfilePrivacyValidationError, type ProfilePrivacyPatch } from '@missa/radar-engine';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError } from '@missa/radar-adapters';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorProfileRepository } from '@/lib/creatorRepositories';

const noStore = { 'Cache-Control': 'no-store' };

function errorResponse(error: string, status: 400 | 401 | 404 | 409 | 500) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

async function session() {
  const cookieStore = await cookies();
  return getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function GET() {
  const current = await session();
  if (!current?.account.userId) return errorResponse('Not authenticated', 401);
  const repository = getCreatorProfileRepository();
  if (repository) {
    const profile = await repository.profile(current.account.id);
    if (!profile) return errorResponse('Profile not found', 404);
    return NextResponse.json({ settings: profile.privacy, revision: profile.revision, publicUrl: `/profile/${encodeURIComponent(profile.userId)}` }, { headers: noStore });
  }
  const engine = await getEngine();
  const settings = engine.profilePrivacy(current.account.userId);
  if (!settings) return errorResponse('Profile not found', 404);
  return NextResponse.json({ settings, publicUrl: `/profile/${encodeURIComponent(current.account.userId)}` }, { headers: noStore });
}

export async function PATCH(request: Request) {
  const current = await session();
  if (!current?.account.userId) return errorResponse('Not authenticated', 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body must be valid JSON.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return errorResponse('Privacy settings must be an object.', 400);

  const repository = getCreatorProfileRepository();
  if (repository) {
    const record = body as Record<string, unknown>;
    if (Object.keys(record).some((key) => !['displayName', 'bio', 'trackedOpportunityCount', 'expectedRevision'].includes(key))) return errorResponse('Only supported profile visibility settings can be changed.', 400);
    if (!Number.isSafeInteger(record.expectedRevision) || (record.expectedRevision as number) < 1) return errorResponse('expectedRevision must be a positive integer.', 400);
    const profile = await repository.profile(current.account.id);
    if (!profile) return errorResponse('Profile not found', 404);
    const settings = {
      displayName: record.displayName ?? profile.privacy.displayName,
      bio: record.bio ?? profile.privacy.bio,
      trackedOpportunityCount: record.trackedOpportunityCount ?? profile.privacy.trackedOpportunityCount,
    } as typeof profile.privacy;
    try {
      const receipt = await repository.updatePrivacy(
        creatorCommandEnvelope(current.account.id, 'profile.privacy.update', request.headers.get('Idempotency-Key')?.trim() ?? '', settings, record.expectedRevision as number),
        settings,
      );
      return NextResponse.json({ settings, revision: receipt.revision, idempotent: receipt.replayed, publicUrl: `/profile/${encodeURIComponent(profile.userId)}` }, { headers: noStore });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return errorResponse(error.message, 400);
      if (error instanceof CreatorConflictError) return NextResponse.json({ error: error.message, conflict: { action: 'refresh-and-retry', expectedRevision: error.expectedRevision, actualRevision: error.actualRevision } }, { status: 409, headers: noStore });
      console.error('Relational Profile privacy update failed', error);
      return errorResponse('We could not save your privacy settings. Check your connection and try again.', 500);
    }
  }

  const engine = await getEngine();
  try {
    const result = engine.updateProfilePrivacy(current.account.userId, body as ProfilePrivacyPatch);
    if (result.changedFields.length > 0) {
      const detail = JSON.stringify(Object.fromEntries(result.changedFields.map((field) => [field, result.settings[field]])));
      engine.recordAudit(current.account.id, 'profile.privacy_updated', 'user_profile', result.user.id, detail);
      await persistRadar();
    }
    return NextResponse.json({ settings: result.settings, publicUrl: `/profile/${encodeURIComponent(result.user.id)}`, changedFields: result.changedFields }, { headers: noStore });
  } catch (error) {
    if (error instanceof ProfilePrivacyValidationError || (error instanceof Error && error.name === 'ProfilePrivacyValidationError')) return errorResponse(error.message, 400);
    console.error('Profile privacy update failed', error);
    return errorResponse('We could not save your privacy settings. Check your connection and try again.', 500);
  }
}
