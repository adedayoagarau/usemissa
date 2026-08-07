import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { AppNav } from '@/components/app-nav';
import { ProfileForm } from './profile-form';
import { EmailForwardingCard } from '@/components/email-forwarding-card';
import { GmailSyncCard } from '@/components/gmail-sync-card';
import { ProfileProps } from '@/components/profile-props';
import { SavedSearches } from '@/components/saved-searches';
import { FollowingList } from '@/components/following-list';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login?next=%2Fprofile');

  const engine = await getEngine();
  const user = engine.store.users.get(session.account.userId);
  if (!user) notFound();
  const profile = {
    id: user.id,
    displayName: user.displayName.trim(),
    ...(user.bio?.trim() ? { bio: user.bio.trim() } : {}),
    ...(user.taxonomyPreferences?.length ? { taxonomyPreferences: user.taxonomyPreferences } : {}),
    completeness: engine.profileCompleteness(user.id),
    privacy: engine.profilePrivacy(user.id)!,
    publicUrl: `/profile/${encodeURIComponent(user.id)}`,
  };
  const organizations = session.memberships.map((membership) => ({ id: membership.organizationId, name: engine.store.organizations.get(membership.organizationId)?.name ?? membership.organizationId }));
  const savedSearches = [...engine.store.radarProfiles.values()].filter((saved) => saved.userId === user.id);
  const following = engine.store.follows.filter((follow) => follow.userId === user.id).map((follow) => ({ organizationId: follow.organizationId, organizationName: engine.store.organizations.get(follow.organizationId)?.name ?? follow.organizationId, followedAt: follow.followedAt }));

  return <div className="min-h-screen bg-white"><AppNav email={session.account.email} userId={session.account.userId} isAdmin={session.account.isAdmin} organizations={organizations} /><main className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 lg:px-8"><header className="max-w-2xl"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Your account</p><h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">Profile</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Keep your public identity current so organizations can understand your work before you submit.</p></header><div className="mt-8 space-y-6"><ProfileForm initialProfile={profile} /><SavedSearches userId={user.id} profiles={savedSearches} /><FollowingList userId={user.id} following={following} /><ProfileProps props={engine.propsForUser(user.id)} /><GmailSyncCard /><EmailForwardingCard /></div></main></div>;
}
