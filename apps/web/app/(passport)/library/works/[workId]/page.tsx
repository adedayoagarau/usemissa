import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { taxonomyTermById } from '@missa/taxonomy';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getCreatorLibraryRepository } from '@/lib/creatorRepositories';
import { WorkDetailProduct, type WorkDetailSection } from '@/components/work-detail-product';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function safeSection(value: string): WorkDetailSection {
  return value === 'files' || value === 'practice' || value === 'history' ? value : 'overview';
}

function safeReturnTo(value: string): string {
  if (!value.startsWith('/library') || value.startsWith('//') || value.length > 700) return '/library';
  return value;
}

function numericField(value: object, field: string): number | undefined {
  const candidate = Reflect.get(value, field);
  return typeof candidate === 'number' ? candidate : undefined;
}

export default async function LibraryWorkPage({ params, searchParams }: {
  params: Promise<{ workId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { workId } = await params;
  const raw = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect(`/login?next=${encodeURIComponent(`/library/works/${workId}`)}`);

  const userId = session.account.userId;
  const repository = getCreatorLibraryRepository();
  const engine = repository ? undefined : await getEngine();
  const library = repository ? await repository.library(session.account.id, userId) : engine!.library(userId);
  const work = library.works.find((item) => item.id === workId);
  if (!work) notFound();

  const currentFile = work.fileId ? library.files.find((file) => file.id === work.fileId) : undefined;
  const relationalConnections = repository ? await repository.workConnections(session.account.id, workId) : undefined;
  const trackerConnections = relationalConnections?.tracker ?? engine!.store.tracked.flatMap((tracked) => {
    if (tracked.userId !== userId || tracked.workId !== work.id) return [];
    const opportunity = engine!.store.opportunities.get(tracked.opportunityId);
    if (!opportunity) return [];
    return [{
      opportunityId: opportunity.id,
      title: opportunity.fields.title,
      organizationName: opportunity.fields.organizationName,
      status: tracked.myStatus,
      deadline: opportunity.fields.deadline.date,
    }];
  });

  const checklistCounts = new Map<string, number>();
  for (const item of engine?.store.checklistItems.values() ?? []) {
    if (item.libraryWorkId !== work.id) continue;
    const checklist = engine!.store.checklists.get(item.checklistId);
    if (!checklist || checklist.userId !== userId) continue;
    checklistCounts.set(checklist.opportunityId, (checklistCounts.get(checklist.opportunityId) ?? 0) + 1);
  }
  const checklistConnections = relationalConnections?.checklists ?? [...checklistCounts.entries()].map(([opportunityId, itemCount]) => ({
    opportunityId,
    title: engine!.store.opportunities.get(opportunityId)?.fields.title ?? 'Opportunity no longer available',
    itemCount,
  }));

  return (
    <WorkDetailProduct
      work={{
        id: work.id,
        revision: numericField(work, 'revision'),
        title: work.title,
        description: work.description,
        fileId: work.fileId,
        createdAt: work.createdAt,
        updatedAt: work.updatedAt,
        terms: (work.taxonomyAssignments ?? []).flatMap((assignment) => {
          const term = taxonomyTermById(assignment.termId);
          return term ? [{ termId: term.id, label: term.preferredLabel, facet: term.facet }] : [];
        }),
      }}
      currentFile={currentFile ? { id: currentFile.id, filename: currentFile.filename, contentType: currentFile.contentType, byteLength: currentFile.byteLength, createdAt: currentFile.createdAt } : undefined}
      currentFileMissing={Boolean(work.fileId && !currentFile)}
      files={library.files.map((file) => ({ id: file.id, filename: file.filename, contentType: file.contentType, byteLength: file.byteLength, createdAt: file.createdAt }))}
      trackerConnections={trackerConnections}
      checklistConnections={checklistConnections}
      returnTo={safeReturnTo(first(raw.from))}
      initialSection={safeSection(first(raw.section))}
      storageReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID))}
    />
  );
}
