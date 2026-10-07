import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEngine } from '@/lib/engine';
import { publicResultsFor } from '@/lib/publicResults';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { getWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { MissaSiteHeader } from '@/components/missa-site-header';
import '@/components/design-system/organization-palette.css';

export const dynamic = 'force-dynamic';

async function load(organizationId: string, openCallId: string) {
  if (workspaceRelationalAuthorityEnabled()) return undefined;
  const [radar, workspace] = await Promise.all([getEngine(), getWorkspaceEngine()]);
  const organization = radar.store.organizations.get(organizationId);
  const config = organization?.customization?.publishedResults?.[openCallId];
  if (!organization || !config) return undefined;
  const results = publicResultsFor({ radar, workspace, organizationId, openCallId, config });
  return results ? { results, publishedAt: config.publishedAt, accent: resolveOrganizationCustomization(organization).accent } : undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ organizationId: string; openCallId: string }> }): Promise<Metadata> {
  const { organizationId, openCallId } = await params;
  const loaded = await load(organizationId, openCallId).catch(() => undefined);
  return loaded ? { title: `${loaded.results.opportunityTitle} results · ${loaded.results.organizationName}`, description: `Results announced by ${loaded.results.organizationName}.` } : { title: 'Results not published', robots: { index: false } };
}

/** The results an organization chose to publish for one opportunity. */
export default async function PublicResultsPage({ params }: { params: Promise<{ organizationId: string; openCallId: string }> }) {
  const { organizationId, openCallId } = await params;
  const loaded = await load(organizationId, openCallId).catch(() => undefined);
  if (!loaded) notFound();
  const { results, publishedAt, accent } = loaded;
  const sections = [
    ...(results.winners.length ? [{ key: 'winners', label: 'Selected', entries: results.winners }] : []),
    ...[...results.stages].reverse().map((stage) => ({ key: stage.stage, label: stage.label, entries: stage.entries })),
  ];
  return <>
    <MissaSiteHeader session={null} current="Organization" />
    <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6" data-org-accent={accent !== 'forest' ? accent : undefined}>
      <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">{results.organizationName}</p>
      <h1 className="mt-2 font-heading text-4xl font-medium text-foreground">{results.opportunityTitle}: results</h1>
      {results.introduction ? <p className="mt-4 text-base leading-7 whitespace-pre-line text-muted-foreground">{results.introduction}</p> : null}
      <p className="mt-3 text-xs text-muted-foreground">Published <time dateTime={publishedAt}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(publishedAt))}</time></p>
      {sections.map((section) => (
        <section key={section.key} aria-labelledby={`results-${section.key}`} className="mt-10">
          <h2 id={`results-${section.key}`} className="font-heading text-2xl font-medium text-foreground">{section.label} <span className="font-mono text-sm text-muted-foreground">{section.entries.length}</span></h2>
          {section.entries.length ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {section.entries.map((entry, index) => <li key={`${entry.name}-${index}`} className="py-3"><p className="text-base font-medium text-foreground">{entry.name}</p><p className="mt-1 text-sm text-muted-foreground">{entry.workTitles.join(' · ')}</p></li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">No names have been announced for this stage yet.</p>}
        </section>
      ))}
      <p className="mt-12 text-xs text-muted-foreground">Published by {results.organizationName} through Missa. Only names and Work titles are shown.</p>
    </main>
  </>;
}
