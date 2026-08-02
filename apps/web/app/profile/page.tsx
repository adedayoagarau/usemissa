import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { AppNav } from '@/components/app-nav';
import { ProfileForm } from './profile-form';

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
    completeness: engine.profileCompleteness(user.id),
    publicUrl: `/profile/${encodeURIComponent(user.id)}`,
  };

  return <div className="min-h-screen bg-white"><AppNav email={session.account.email} userId={session.account.userId} /><main className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 lg:px-8"><header className="max-w-2xl"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Your account</p><h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">Profile</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Keep your public identity current so organizations can understand your work before you submit.</p></header><div className="mt-8"><ProfileForm initialProfile={profile} /></div></main></div>;
}
