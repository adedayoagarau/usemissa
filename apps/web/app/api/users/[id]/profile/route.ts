import { NextResponse } from 'next/server';
import type { ProfileDetails } from '@missa/radar-engine';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const arrayFields = new Set(['disciplines', 'languages']);
const stringFields = new Set(['pronouns', 'location', 'bio', 'careerStage']);

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function profilePatch(input: unknown): { patch: Partial<ProfileDetails>; displayName?: string; genres?: string[] } {
  const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const source = body.profile && typeof body.profile === 'object' ? body.profile as Record<string, unknown> : body;
  const patch: Partial<ProfileDetails> = {};
  for (const field of stringFields) {
    if (typeof source[field] === 'string') (patch as Record<string, unknown>)[field] = source[field].trim();
  }
  for (const field of arrayFields) {
    const value = asStringArray(source[field]);
    if (value) (patch as Record<string, unknown>)[field] = value;
  }
  if (source.eligibility && typeof source.eligibility === 'object') patch.eligibility = Object.fromEntries(
    Object.entries(source.eligibility as Record<string, unknown>).filter(([key, value]) => key.trim() && typeof value === 'string').map(([key, value]) => [key.trim(), (value as string).trim()]),
  );
  if (source.preferences && typeof source.preferences === 'object') {
    const preferences = source.preferences as Record<string, unknown>;
    patch.preferences = {
      ...(asStringArray(preferences.disciplines) ? { disciplines: asStringArray(preferences.disciplines) } : {}),
      ...(asStringArray(preferences.locations) ? { locations: asStringArray(preferences.locations) } : {}),
      ...(asStringArray(preferences.languages) ? { languages: asStringArray(preferences.languages) } : {}),
      ...(typeof preferences.careerStage === 'string' ? { careerStage: preferences.careerStage.trim() } : {}),
      ...(typeof preferences.noFeeOnly === 'boolean' ? { noFeeOnly: preferences.noFeeOnly } : {}),
      ...(typeof preferences.maxFeeCents === 'number' && Number.isFinite(preferences.maxFeeCents) ? { maxFeeCents: Math.max(0, Math.round(preferences.maxFeeCents)) } : {}),
      ...(typeof preferences.deadlineWithinDays === 'number' && Number.isFinite(preferences.deadlineWithinDays) ? { deadlineWithinDays: Math.max(1, Math.round(preferences.deadlineWithinDays)) } : {}),
      ...(typeof preferences.simultaneousRequired === 'boolean' ? { simultaneousRequired: preferences.simultaneousRequired } : {}),
    } as ProfileDetails['preferences'];
  }
  if (source.privacy && typeof source.privacy === 'object') {
    const privacy = source.privacy as Record<string, unknown>;
    patch.privacy = {
      ...(typeof privacy.publicProfile === 'boolean' ? { publicProfile: privacy.publicProfile } : {}),
      ...(typeof privacy.showLocation === 'boolean' ? { showLocation: privacy.showLocation } : {}),
      ...(typeof privacy.shareContact === 'boolean' ? { shareContact: privacy.shareContact } : {}),
      ...(typeof privacy.shareMaterialsByDefault === 'boolean' ? { shareMaterialsByDefault: privacy.shareMaterialsByDefault } : {}),
    } as ProfileDetails['privacy'];
  }
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : undefined;
  const genres = asStringArray(body.genres);
  return { patch, displayName, genres };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const engine = await getEngine();
  const user = engine.store.users.get(id);
  if (!user) return NextResponse.json({ error: 'Unknown user' }, { status: 404 });
  return NextResponse.json({ profile: engine.getProfile(id), readiness: engine.getProfileReadiness(id), displayName: user.displayName, genres: user.genres });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const { patch, displayName, genres } = profilePatch(body);
  if (displayName !== undefined && !displayName) return NextResponse.json({ error: 'displayName cannot be empty' }, { status: 400 });
  const engine = await getEngine();
  const user = engine.store.users.get(id);
  if (!user) return NextResponse.json({ error: 'Unknown user' }, { status: 404 });
  if (genres) user.genres = genres;
  const profile = engine.updateProfile(id, patch, displayName);
  await persistRadar();
  return NextResponse.json({ profile, readiness: engine.getProfileReadiness(id), displayName: user.displayName, genres: user.genres });
}
