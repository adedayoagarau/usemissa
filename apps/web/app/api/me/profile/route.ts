import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ProfileValidationError, type UserProfilePatch } from '@missa/radar-engine';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const noStore = { 'Cache-Control': 'no-store' };

function jsonError(error: string, status: 400 | 401 | 404 | 500) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

async function sessionForRequest() {
  const cookieStore = await cookies();
  return getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

function ownerResponse(engine: Awaited<ReturnType<typeof getEngine>>, userId: string) {
  const user = engine.store.users.get(userId);
  if (!user) return undefined;
  const completeness = engine.profileCompleteness(userId);
  return {
    id: user.id,
    displayName: user.displayName.trim(),
    ...(user.bio?.trim() ? { bio: user.bio.trim() } : {}),
    ...(user.taxonomyPreferences?.length ? { taxonomyPreferences: user.taxonomyPreferences } : {}),
    completeness,
    publicUrl: `/profile/${encodeURIComponent(user.id)}`,
  };
}

export async function GET() {
  const session = await sessionForRequest();
  if (!session?.account.userId) return jsonError('Not authenticated', 401);
  const engine = await getEngine();
  const profile = ownerResponse(engine, session.account.userId);
  if (!profile) return jsonError('Profile not found', 404);
  return NextResponse.json(profile, { headers: noStore });
}

export async function PATCH(request: Request) {
  const session = await sessionForRequest();
  if (!session?.account.userId) return jsonError('Not authenticated', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('Request body must be an object.', 400);

  const entries = Object.entries(body as Record<string, unknown>);
  if (entries.some(([key]) => key !== 'displayName' && key !== 'bio' && key !== 'taxonomyPreferences')) return jsonError('Only profile identity and taxonomy preferences can be updated.', 400);
  if (entries.some(([key, value]) => key !== 'taxonomyPreferences' && typeof value !== 'string')) return jsonError('Display name and bio must be strings.', 400);
  if (Object.prototype.hasOwnProperty.call(body, 'taxonomyPreferences') && (!Array.isArray((body as Record<string, unknown>).taxonomyPreferences))) return jsonError('Taxonomy preferences must be an array.', 400);

  const patch = body as UserProfilePatch;
  const engine = await getEngine();
  try {
    const saved = engine.updateUserProfile(session.account.userId, patch);
    engine.recordAudit(session.account.id, 'profile.updated', 'user_profile', saved.id, 'Updated public profile fields');
    await persistRadar();
    const response = ownerResponse(engine, saved.id);
    return NextResponse.json(response, { headers: noStore });
  } catch (error) {
    if (error instanceof ProfileValidationError || (error instanceof Error && error.name === 'ProfileValidationError')) return jsonError(error.message, 400);
    console.error('Profile update failed', error);
    return jsonError('We could not save your profile. Check your connection and try again.', 500);
  }
}
