import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { isWritingEntryId, type WritingEntrySummary } from "@/lib/writing";
import { getWritingRepository } from "@/lib/writing-repository";
import type { WritingProject } from "@/lib/writing-projects";
import { WritingRoomLoader } from "@/components/missa/writing-room-loader";

export const metadata = {
  title: "Write",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The writing room. It sits outside the creator shell so the page holds only
 * the writing; the room links back to Home.
 */
export default async function WritePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const raw = searchParams ? await searchParams : {};
  const requested = Array.isArray(raw.entry) ? raw.entry[0] : raw.entry;
  const entryId = isWritingEntryId(requested) ? requested : undefined;

  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session) {
    redirect(
      `/login?next=${encodeURIComponent(entryId ? `/doc?entry=${entryId}` : "/doc")}`,
    );
  }

  const repository = getWritingRepository();
  let entries: WritingEntrySummary[] = [];
  let projects: WritingProject[] = [];
  let listFailed = false;
  if (repository) {
    try {
      [entries, projects] = await Promise.all([
        repository.list(session.account.id),
        repository.listProjects(session.account.id),
      ]);
    } catch {
      listFailed = true;
    }
  }

  return (
    <WritingRoomLoader
      deviceKey={createHash("sha256")
        .update(`missa-write:${session.account.id}`)
        .digest("hex")
        .slice(0, 24)}
      initialEntries={entries}
      initialProjects={projects}
      initialEntryId={entryId}
      storage={repository ? "account" : "device"}
      listFailed={listFailed}
    />
  );
}
