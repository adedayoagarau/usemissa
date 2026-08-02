import { notFound } from 'next/navigation';
import { ExternalLink, FileText, MapPin } from 'lucide-react';
import { MissaWordmark } from '@/components/missa-wordmark';
import { getEngine } from '@/lib/engine';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const engine = await getEngine();
  const user = engine.store.users.get(id);
  if (!user) notFound();

  const profile = engine.getProfile(id);
  if (!profile.privacy.publicProfile) notFound();

  const materials = profile.materials.filter(
    (material) => material.status === 'ready' && material.visibility === 'public',
  );

  return (
    <main className="min-h-screen bg-white px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <MissaWordmark href="/" size="app" />
        <header className="mt-16 border-b border-border pb-8">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
            Public profile
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{user.displayName}</h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {profile.location && profile.privacy.showLocation && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {profile.location}
              </span>
            )}
            {profile.pronouns && <span>{profile.pronouns}</span>}
          </div>
          {profile.bio && <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">{profile.bio}</p>}
        </header>

        <section className="border-b border-border py-8">
          <h2 className="text-sm font-semibold">Practice</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...profile.disciplines, ...user.genres].map((item) => (
              <span key={item} className="rounded-full border border-border px-3 py-1.5 text-sm">
                {item}
              </span>
            ))}
          </div>
        </section>

        {materials.length > 0 && (
          <section className="py-8">
            <h2 className="text-sm font-semibold">Selected work</h2>
            <div className="mt-4 space-y-3">
              {materials.map((material) => (
                <article key={material.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <FileText className="mt-0.5 size-4 text-primary" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium">{material.title}</h3>
                    {material.content && <p className="mt-1 text-sm leading-5 text-muted-foreground">{material.content}</p>}
                    {material.url && (
                      <a href={material.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline">
                        Open work <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-xs text-muted-foreground">This profile is shared by its owner through Missa.</p>
      </div>
    </main>
  );
}
