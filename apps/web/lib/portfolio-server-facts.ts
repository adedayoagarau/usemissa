import { cache } from "react";
import {
  MAX_HANDLE_LOOKUPS,
  normalizeUserHandleInput,
  type PostgresCreatorProfileRepository,
  type PublishedCreditList,
} from "@missa/radar-adapters";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import type {
  PortfolioData,
  ServerFacts,
} from "@/lib/creator-portfolio-schema";
import {
  bookingTypeFromContentType,
  type BookingFileType,
} from "@/lib/portfolio-booking-files";
import {
  MAX_COLLABORATOR_LOOKUPS,
  SELF_CREDIT_MESSAGE,
  collaboratorIssue,
  duplicateCreditMessage,
  mediaIdOf,
  withCollaboratorKeys,
  type CollaboratorLookup,
  type CollaboratorStatus,
} from "@/lib/portfolio-collaborators";

/**
 * What only the server can say about the add-ons, supplied wherever
 * `withServerProvenance` runs: whether each credited creator lists this one
 * back, and what type and size each Booking kit file really is. Nothing here
 * comes from the client; every value is read from the database.
 */

/** The repository methods the facts need, so tests can stand in for them. */
export type FactsStore = Pick<
  PostgresCreatorProfileRepository,
  | "portfolioMediaFacts"
  | "userIdsForHandles"
  | "userHandleKeys"
  | "publishedCreditLists"
>;

/** The account whose draft or snapshot is being described. */
export type FactsOwner = { accountId: string; userId?: string | null };

/** The handle namespace's own gate, so a stored handle is what `/@handle` reads. */
const handleKey = (raw: string) => normalizeUserHandleInput(raw);

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * The handles a published snapshot credits, if its Collaborators section is
 * switched on and shown. Credits still waiting count: the snapshot keeps them
 * so the person credited can confirm against it. The snapshot's own
 * `confirmed` flags are ignored, because they are only a hint from publish time.
 */
export function creditedHandles(list: PublishedCreditList): Set<string> {
  const modules = Array.isArray(list.modules) ? list.modules : [];
  const section = modules.find(
    (entry) => isObject(entry) && entry.id === "collaborators",
  );
  const handles = new Set<string>();
  if (!isObject(section) || section.added !== true || section.visible === false)
    return handles;
  for (const entry of Array.isArray(list.collaborators)
    ? list.collaborators
    : []) {
    if (!isObject(entry)) continue;
    if (typeof entry.handle !== "string" || typeof entry.name !== "string")
      continue;
    if (!entry.name.trim()) continue;
    const key = handleKey(entry.handle);
    if (key) handles.add(key);
  }
  return handles;
}

type Credit = {
  status: CollaboratorStatus;
  name?: string;
  /** The user behind the handle, when it is a claimed user handle. */
  userId?: string;
};

type Credits = {
  /** One entry per handle asked about, keyed by its normalized form. */
  byKey: Map<string, Credit>;
  /** Handles that are this creator's own, current or old. */
  ownKeys: Set<string>;
};

/**
 * Looks up at most twelve credited handles in three queries: who owns them,
 * which handles this creator answers to, and what those people have published.
 * A handle is `confirmed` only when its owner has a live snapshot that credits
 * this creator, and never for the creator's own handle.
 *
 * A handle with no published profile behind it answers `not-published`,
 * whether it is unclaimed, reserved or claimed by someone who has not
 * published. That is all `/@handle` says (a 404), so the answer reveals nothing
 * more.
 */
export async function creditsFor(
  owner: FactsOwner,
  rawHandles: readonly string[],
  store: FactsStore,
): Promise<Credits> {
  const keys = [
    ...new Set(
      rawHandles.map(handleKey).filter((key): key is string => Boolean(key)),
    ),
  ].slice(0, Math.min(MAX_COLLABORATOR_LOOKUPS, MAX_HANDLE_LOOKUPS));
  const byKey = new Map<string, Credit>();
  const ownKeys = new Set<string>();
  if (!keys.length) return { byKey, ownKeys };

  const [ids, mine] = await Promise.all([
    store.userIdsForHandles(keys),
    owner.userId ? store.userHandleKeys(owner.userId) : Promise.resolve([]),
  ]);
  for (const key of mine) ownKeys.add(key);
  const neighbours = [
    ...new Set([...ids.values()].filter((userId) => userId !== owner.userId)),
  ];
  const lists = neighbours.length
    ? await store.publishedCreditLists(neighbours)
    : new Map<string, PublishedCreditList>();

  for (const key of keys) {
    const userId = ids.get(key);
    if (userId && userId === owner.userId) ownKeys.add(key);
    const list =
      userId && userId !== owner.userId ? lists.get(userId) : undefined;
    if (!userId || !list) {
      byKey.set(key, {
        status: "not-published",
        ...(userId ? { userId } : {}),
      });
      continue;
    }
    const name = typeof list.name === "string" ? list.name.trim() : "";
    const listsMe = [...creditedHandles(list)].some((credited) =>
      ownKeys.has(credited),
    );
    byKey.set(key, {
      status: listsMe ? "confirmed" : "waiting",
      userId,
      ...(name ? { name } : {}),
    });
  }
  return { byKey, ownKeys };
}

/**
 * Type and size of the Booking kit files, read from the stored files without
 * loading them. A file that is not a PDF or a ZIP, or that this account does
 * not own, has no entry.
 */
async function documentFacts(
  draft: PortfolioData,
  owner: FactsOwner,
  store: FactsStore,
) {
  const ids = draft.booking.files
    .map((file) => mediaIdOf(file.file))
    .filter(Boolean);
  const files = new Map<string, { type: BookingFileType; bytes: number }>();
  if (!ids.length) return files;
  for (const stored of await store.portfolioMediaFacts(owner.accountId, ids)) {
    const type = bookingTypeFromContentType(stored.contentType);
    if (type) files.set(stored.id, { type, bytes: stored.bytes });
  }
  return files;
}

async function factsFor(
  draft: PortfolioData,
  owner: FactsOwner,
  store: FactsStore,
  credits?: Credits,
) {
  const resolved =
    credits ??
    (await creditsFor(
      owner,
      draft.collaborators.map((entry) => entry.handle),
      store,
    ));
  const confirmedHandles = new Set<string>();
  for (const entry of draft.collaborators) {
    const key = handleKey(entry.handle);
    if (key && resolved.byKey.get(key)?.status === "confirmed")
      confirmedHandles.add(entry.handle.toLowerCase());
  }
  const files = await documentFacts(draft, owner, store);
  return { facts: { confirmedHandles, files } satisfies ServerFacts, resolved };
}

/** Request-scoped, so a page that reads a profile twice asks the database once. */
const creditsForRequest = cache(
  async (accountId: string, userId: string, handles: string) => {
    const store = getCreatorProfileRepository();
    if (!store) return undefined;
    return creditsFor(
      { accountId, userId: userId || undefined },
      handles ? handles.split(",") : [],
      store,
    );
  },
);

/**
 * The facts for a draft or a published snapshot, for `withServerProvenance`.
 * It fails closed: if storage cannot be read, nobody is Confirmed and no file
 * carries a type or size, which hides things and never invents them.
 */
export async function portfolioServerFacts(
  draft: PortfolioData,
  owner: FactsOwner,
  store?: FactsStore,
): Promise<ServerFacts> {
  try {
    const source = store ?? getCreatorProfileRepository();
    if (!source) return {};
    const credits = store
      ? undefined
      : await creditsForRequest(
          owner.accountId,
          owner.userId ?? "",
          draft.collaborators.map((entry) => entry.handle).join(","),
        );
    return (await factsFor(draft, owner, source, credits)).facts;
  } catch {
    return {};
  }
}

/**
 * The same facts for a write, plus the first reason the draft cannot be saved
 * or published: crediting yourself (by any handle you have ever had), the same
 * person twice (even by an old and a current handle), or a Booking kit file
 * that is not a PDF or ZIP stored by this account. Storage errors are thrown,
 * so a failed check is never mistaken for a pass.
 */
export async function reviewPortfolioDraft(
  draft: PortfolioData,
  owner: FactsOwner,
  store?: FactsStore,
): Promise<{ facts: ServerFacts; issue?: string }> {
  const source = store ?? getCreatorProfileRepository();
  if (!source) throw new Error("Account storage is unavailable.");
  const { facts, resolved } = await factsFor(draft, owner, source);
  const issue =
    collaboratorIssue(draft.collaborators, [...resolved.ownKeys]) ??
    resolvedCreditIssue(draft, resolved) ??
    documentIssue(draft, facts);
  return { facts, ...(issue ? { issue } : {}) };
}

/** Two handles that belong to one person, or one that belongs to this creator. */
function resolvedCreditIssue(draft: PortfolioData, credits: Credits) {
  const people = new Set<string>();
  for (const entry of draft.collaborators) {
    const key = handleKey(entry.handle);
    const credit = key ? credits.byKey.get(key) : undefined;
    if (!key || !credit?.userId) continue;
    if (credits.ownKeys.has(key)) return SELF_CREDIT_MESSAGE;
    if (people.has(credit.userId)) return duplicateCreditMessage(key);
    people.add(credit.userId);
  }
  return undefined;
}

/** Booking kit files must be PDF or ZIP files this account uploaded. */
export function documentIssue(
  draft: PortfolioData,
  facts: ServerFacts,
): string | undefined {
  const bad = draft.booking.files.find(
    (file) => file.file && !facts.files?.has(mediaIdOf(file.file)),
  );
  if (!bad) return undefined;
  const label = bad.label.trim();
  return label
    ? `“${label}” isn’t a PDF or ZIP you uploaded. Add the file again.`
    : "A booking kit file isn’t a PDF or ZIP you uploaded. Add the file again.";
}

/** Stored handles are the ones `/@handle` resolves, so every comparison agrees. */
export function normalizedCollaborators(draft: PortfolioData): PortfolioData {
  return withCollaboratorKeys(draft, handleKey);
}

/**
 * Who "Credit as collaborator" should start a row for. Only a published
 * profile that is not your own qualifies, so a link to an unclaimed,
 * unpublished or mistyped handle opens the studio with nothing prefilled, the
 * same as any other link, and reveals nothing about that handle.
 */
export async function publishedCreditTarget(
  owner: FactsOwner,
  raw: string | undefined,
  store?: FactsStore,
): Promise<{ handle: string; name: string } | undefined> {
  const key = raw ? handleKey(raw.slice(0, 60)) : null;
  const source = store ?? getCreatorProfileRepository();
  if (!key || !source) return undefined;
  try {
    const userId = (await source.userIdsForHandles([key])).get(key);
    if (!userId || userId === owner.userId) return undefined;
    const list = (await source.publishedCreditLists([userId])).get(userId);
    const name = typeof list?.name === "string" ? list.name.trim() : "";
    return list && name ? { handle: key, name } : undefined;
  } catch {
    return undefined;
  }
}

/** The reply of the collaborator status endpoint. */
export async function collaboratorStatuses(
  owner: FactsOwner,
  rawHandles: readonly string[],
  store?: FactsStore,
): Promise<CollaboratorLookup[]> {
  const source = store ?? getCreatorProfileRepository();
  if (!source) throw new Error("Account storage is unavailable.");
  const { byKey } = await creditsFor(owner, rawHandles, source);
  const seen = new Set<string>();
  const lookups: CollaboratorLookup[] = [];
  for (const raw of rawHandles) {
    const key = handleKey(raw);
    if (!key) {
      lookups.push({
        handle: raw.trim().replace(/^@/u, ""),
        status: "not-published",
      });
      continue;
    }
    if (seen.has(key) || !byKey.has(key)) continue;
    seen.add(key);
    const credit = byKey.get(key)!;
    lookups.push({
      handle: key,
      status: credit.status,
      ...(credit.name && credit.status !== "not-published"
        ? { name: credit.name }
        : {}),
    });
  }
  return lookups;
}
