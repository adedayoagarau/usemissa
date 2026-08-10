import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { libraryFileReferences, libraryWorkReferences, savedAnswerReferences } from '@missa/radar-engine';
import { taxonomyTermById } from '@missa/taxonomy';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import {
  LibraryProduct,
  type LibraryProductAnswer,
  type LibraryProductFile,
  type LibraryProductSort,
  type LibraryProductView,
  type LibraryProductWork,
} from '@/components/library-product';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function safeView(value: string): LibraryProductView {
  return value === 'files' || value === 'answers' ? value : 'works';
}

function safeSort(value: string): LibraryProductSort {
  return value === 'title' ? 'title' : 'updated';
}

export default async function LibraryPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login?next=/library');

  const raw = searchParams ? await searchParams : {};
  const userId = session.account.userId;
  const engine = await getEngine();
  const library = engine.library(userId);

  const works: LibraryProductWork[] = library.works.map((work) => {
    const file = work.fileId ? engine.store.libraryFiles.get(work.fileId) : undefined;
    const references = libraryWorkReferences(engine.store, userId, work.id);
    return {
      id: work.id,
      title: work.title,
      description: work.description,
      updatedAt: work.updatedAt,
      file: file && file.userId === userId ? { id: file.id, filename: file.filename, contentType: file.contentType, byteLength: file.byteLength } : undefined,
      terms: (work.taxonomyAssignments ?? []).flatMap((assignment) => {
        const term = taxonomyTermById(assignment.termId);
        return term ? [{ termId: term.id, label: term.preferredLabel, facet: term.facet }] : [];
      }),
      trackerCount: references.tracker,
      checklistCount: references.checklists,
    };
  });

  const files: LibraryProductFile[] = library.files.map((file) => {
    const references = libraryFileReferences(engine.store, userId, file.id);
    return {
      id: file.id,
      filename: file.filename,
      contentType: file.contentType,
      byteLength: file.byteLength,
      createdAt: file.createdAt,
      linkedWorks: library.works.filter((work) => work.fileId === file.id).map((work) => ({ id: work.id, title: work.title })),
      checklistCount: references.checklists,
    };
  });

  const answers: LibraryProductAnswer[] = library.savedAnswers.map((answer) => ({
    id: answer.id,
    name: answer.name,
    body: answer.body,
    updatedAt: answer.updatedAt,
    checklistCount: savedAnswerReferences(engine.store, userId, answer.id).checklists,
  }));

  return (
    <LibraryProduct
      works={works}
      files={files}
      answers={answers}
      initialView={safeView(first(raw.view))}
      initialSort={safeSort(first(raw.sort))}
      initialQuery={first(raw.q).slice(0, 200)}
      storageReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID))}
    />
  );
}
