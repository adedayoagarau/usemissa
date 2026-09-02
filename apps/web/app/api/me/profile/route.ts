import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ProfileValidationError, type OpportunityPreferences, type TaxonomyPreference, type UserProfilePatch } from '@missa/radar-engine';
import { canonicalTaxonomySelection } from '@missa/taxonomy';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError } from '@missa/radar-adapters';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorPreferenceRepository, getCreatorProfileRepository } from '@/lib/creatorRepositories';

const noStore = { 'Cache-Control': 'no-store' };

function jsonError(error: string, status: 400 | 401 | 404 | 409 | 500 | 503) {
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
    ...(user.opportunityPreferences ? { opportunityPreferences: user.opportunityPreferences } : {}),
    completeness,
    publicUrl: `/profile/${encodeURIComponent(user.id)}`,
  };
}

export async function GET() {
  const session = await sessionForRequest();
  if (!session?.account.userId) return jsonError('Not authenticated', 401);
  const repository = getCreatorProfileRepository();
  if (repository) {
    const profile = await repository.profile(session.account.id);
    if (!profile) return jsonError('Profile not found', 404);
    const preferences = await getCreatorPreferenceRepository()?.preferenceBundle(session.account.id);
    const opportunityPreferencesConfigured = Boolean(preferences && (
      preferences.taxonomyPreferences.length || preferences.opportunityPreferences.types.length ||
      preferences.opportunityPreferences.disciplines.length || preferences.opportunityPreferences.genres.length ||
      preferences.opportunityPreferences.locations.length || preferences.opportunityPreferences.careerStages.length ||
      preferences.opportunityPreferences.maxFeeCents !== undefined || preferences.opportunityPreferences.noFeeOnly ||
      preferences.opportunityPreferences.deadlineWithinDays !== undefined || preferences.opportunityPreferences.simultaneousRequired
    ));
    const missing: Array<'displayName' | 'bio' | 'opportunityPreferences'> = [];
    if (!profile.displayName.trim()) missing.push('displayName');
    if (!profile.bio?.trim()) missing.push('bio');
    if (!opportunityPreferencesConfigured) missing.push('opportunityPreferences');
    return NextResponse.json({
      id: profile.userId,
      displayName: profile.displayName,
      ...(profile.bio ? { bio: profile.bio } : {}),
      ...(preferences?.taxonomyPreferences.length ? { taxonomyPreferences: preferences.taxonomyPreferences } : {}),
      ...(preferences ? { opportunityPreferences: preferences.opportunityPreferences } : {}),
      completeness: { complete: missing.length === 0, missing },
      revision: profile.revision,
      publicUrl: `/profile/${encodeURIComponent(profile.userId)}`,
    }, { headers: noStore });
  }
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
  if (entries.some(([key]) => key !== 'displayName' && key !== 'bio' && key !== 'taxonomyPreferences' && key !== 'opportunityPreferences' && key !== 'expectedRevision')) return jsonError('Only profile identity and opportunity preferences can be updated.', 400);
  if (entries.some(([key, value]) => (key === 'displayName' || key === 'bio') && typeof value !== 'string')) return jsonError('Display name and bio must be strings.', 400);
  if (Object.prototype.hasOwnProperty.call(body, 'taxonomyPreferences') && (!Array.isArray((body as Record<string, unknown>).taxonomyPreferences))) return jsonError('Taxonomy preferences must be an array.', 400);
  if (Object.prototype.hasOwnProperty.call(body, 'opportunityPreferences')) {
    const preferences = (body as Record<string, unknown>).opportunityPreferences;
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return jsonError('Opportunity preferences must be an object.', 400);
  }

  const repository = getCreatorProfileRepository();
  if (repository) {
    if (Object.prototype.hasOwnProperty.call(body, 'taxonomyPreferences') || Object.prototype.hasOwnProperty.call(body, 'opportunityPreferences')) {
      const preferenceRepository = getCreatorPreferenceRepository();
      const record = body as Record<string, unknown>;
      if (!preferenceRepository || !Array.isArray(record.taxonomyPreferences) || !record.opportunityPreferences || typeof record.opportunityPreferences !== 'object' || Array.isArray(record.opportunityPreferences)) {
        return jsonError('Private preferences are invalid.', 400);
      }
      if (!Number.isSafeInteger(record.expectedRevision) || (record.expectedRevision as number) < 1) return jsonError('expectedRevision must be a positive integer.', 400);
      const taxonomyPreferences = record.taxonomyPreferences as TaxonomyPreference[];
      if (taxonomyPreferences.some((item) => !item || typeof item.termId !== 'string' || !['include', 'prefer', 'exclude'].includes(item.preference) || !Number.isInteger(item.weight) || item.weight < 0 || item.weight > 100)) return jsonError('Taxonomy preferences are invalid.', 400);
      if (canonicalTaxonomySelection(taxonomyPreferences.map((item) => item.termId)).invalidTermIds.length) return jsonError('Taxonomy preferences contain an unknown term.', 400);
      try {
        const receipt = await preferenceRepository.updatePreferences(
          creatorCommandEnvelope(session.account.id, 'creator-preferences.update', request.headers.get('Idempotency-Key')?.trim() ?? '', { taxonomyPreferences, opportunityPreferences: record.opportunityPreferences }, record.expectedRevision as number),
          taxonomyPreferences,
          record.opportunityPreferences as OpportunityPreferences,
        );
        const saved = await preferenceRepository.preferenceBundle(session.account.id);
        return NextResponse.json({
          taxonomyPreferences: saved?.taxonomyPreferences ?? taxonomyPreferences,
          opportunityPreferences: saved?.opportunityPreferences ?? record.opportunityPreferences,
          preferencesRevision: receipt.revision,
          idempotent: receipt.replayed,
        }, { headers: noStore });
      } catch (error) {
        if (error instanceof CreatorCommandValidationError) return jsonError(error.message, 400);
        if (error instanceof CreatorConflictError) return NextResponse.json({ error: error.message, conflict: { action: 'refresh-and-retry', expectedRevision: error.expectedRevision, actualRevision: error.actualRevision } }, { status: 409, headers: noStore });
        console.error('Relational preference update failed', error);
        return jsonError('We could not save your private preferences. Check your connection and try again.', 500);
      }
    }
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    const expectedRevision = (body as Record<string, unknown>).expectedRevision;
    if (!Number.isSafeInteger(expectedRevision) || (expectedRevision as number) < 1) return jsonError('expectedRevision must be a positive integer.', 400);
    const current = await repository.profile(session.account.id);
    if (!current) return jsonError('Profile not found', 404);
    try {
      const payload = {
        displayName: typeof (body as Record<string, unknown>).displayName === 'string' ? (body as Record<string, unknown>).displayName as string : current.displayName,
        bio: typeof (body as Record<string, unknown>).bio === 'string' ? (body as Record<string, unknown>).bio as string : current.bio,
      };
      const receipt = await repository.updateProfile(
        creatorCommandEnvelope(session.account.id, 'profile.update', idempotencyKey, payload, expectedRevision as number),
        payload,
      );
      const saved = await repository.profile(session.account.id);
      return NextResponse.json({
        id: saved?.userId ?? current.userId,
        displayName: saved?.displayName ?? payload.displayName,
        ...(saved?.bio ? { bio: saved.bio } : {}),
        revision: receipt.revision,
        idempotent: receipt.replayed,
        publicUrl: `/profile/${encodeURIComponent(saved?.userId ?? current.userId)}`,
      }, { headers: noStore });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return jsonError(error.message, 400);
      if (error instanceof CreatorConflictError) return NextResponse.json({ error: error.message, conflict: { action: 'refresh-and-retry', expectedRevision: error.expectedRevision, actualRevision: error.actualRevision } }, { status: 409, headers: noStore });
      console.error('Relational Profile update failed', error);
      return jsonError('We could not save your profile. Check your connection and try again.', 500);
    }
  }

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
