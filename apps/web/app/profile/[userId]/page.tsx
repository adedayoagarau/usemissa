import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getEngine } from '@/lib/engine';

export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId || userId.length > 200 || /[^a-zA-Z0-9_-]/.test(userId)) notFound();
  const profile = (await getEngine()).publicUserProfile(userId);
  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-white text-foreground">
      <header className="flex min-h-16 items-center justify-between border-b border-border px-4 sm:px-8">
        <Link href="/" className="missa-wordmark missa-wordmark--app" aria-label="Missa home">Missa</Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/opportunities-preview" className="inline-flex min-h-11 items-center px-3 text-sm text-muted-foreground hover:text-foreground">Browse opportunities</Link>
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">Log in</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-[760px] px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Missa profile</p>
        {profile.isPrivate ? <div className="mt-8 rounded-lg border border-border p-6"><h1 className="text-2xl font-semibold tracking-tight text-foreground">This profile is private.</h1><p className="mt-2 text-sm text-muted-foreground">The owner has chosen not to share profile details publicly.</p></div> : <><h1 className="mt-4 font-heading text-5xl font-medium tracking-tight text-foreground sm:text-6xl">{profile.displayName ?? 'Profile'}</h1>{profile.bio && <div className="mt-10 border-t border-border pt-8"><h2 className="text-sm font-semibold text-foreground">About</h2><p className="mt-4 max-w-2xl whitespace-pre-line text-lg leading-8 text-muted-foreground">{profile.bio}</p></div>}{profile.trackedOpportunityCount !== undefined && <div className="mt-10 border-t border-border pt-8"><p className="font-mono text-3xl text-foreground">{profile.trackedOpportunityCount}</p><p className="mt-1 text-sm text-muted-foreground">opportunities tracked</p></div>}</>}
        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-8 sm:flex-row"><Link href="/opportunities-preview" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Explore opportunities <ArrowRight className="size-4" aria-hidden="true" /></Link><Link href="/signup" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-muted">Create your profile</Link></div>
      </main>
      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground sm:px-8"><Link href="/" className="underline-offset-4 hover:underline">Back to Missa</Link><span className="mx-2">·</span><Link href="/opportunities-preview" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">Browse opportunities <ArrowUpRight className="size-3" aria-hidden="true" /></Link></footer>
    </div>
  );
}
