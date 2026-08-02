import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ProfilePrivacyValidationError, type ProfilePrivacyPatch } from '@missa/radar-engine';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const noStore = { 'Cache-Control': 'no-store' };

function errorResponse(error: string, status: 400 | 401 | 404 | 500) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

async function session() {
  const cookieStore = await cookies();
  return getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function GET() {
  const current = await session();
  if (!current?.account.userId) return errorResponse('Not authenticated', 401);
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
