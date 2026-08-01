import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { ProfileEditor } from '@/components/profile-editor';
import type { ProfileSectionKey } from '@missa/radar-engine';

const sectionKeys = new Set<ProfileSectionKey>(['about', 'practice', 'materials', 'preferences', 'privacy']);

export default async function ProfilePage({ searchParams }: { searchParams?: Promise<{ section?: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) return null;
  const engine = await getEngine();
  const user = engine.store.users.get(session.account.userId);
  if (!user) return null;
  const query = searchParams ? await searchParams : {};
  const requestedSection = query.section as ProfileSectionKey;
  return <ProfileEditor userId={user.id} email={session.account.email} displayName={user.displayName} genres={user.genres} profile={engine.getProfile(user.id)} readiness={engine.getProfileReadiness(user.id)} initialSection={sectionKeys.has(requestedSection) ? requestedSection : undefined} />;
}
