import type {
  PortfolioCollaborator,
  PortfolioData,
  ServerFacts,
} from "./creator-portfolio-schema";

/**
 * Rules for crediting collaborators that the studio and the server share.
 * Whether a credit is Confirmed is never decided here: only the server can say
 * the other creator lists this one back (see `portfolio-server-facts.ts`).
 */

/** A request looks up at most this many people, the most a profile can credit. */
export const MAX_COLLABORATOR_LOOKUPS = 12;

const HANDLE_MIN = 3;
const HANDLE_MAX = 30;

/**
 * The key a handle is compared by, the same one `/@handle` resolves: lower case,
 * no leading @, words joined by hyphens. Returns null for text that cannot be a
 * handle. The server uses the handle namespace's own gate for the same job;
 * this copy lets the studio check as you type.
 */
export function collaboratorHandleKey(raw: string): string | null {
  const folded = raw
    .trim()
    .replace(/^@/u, "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("und")
    .replaceAll("&", "and")
    .replace(/['’]/gu, "");
  if (/-{2,}/u.test(folded)) return null;
  const key = folded.replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
  if (key.length < HANDLE_MIN || key.length > HANDLE_MAX) return null;
  return /^[a-z]/u.test(key) ? key : null;
}

/** What the status endpoint says about one credited person. */
export type CollaboratorStatus =
  /** They list you back, so the credit shows on your published profile. */
  | "confirmed"
  /** They have a published profile that does not list you yet. */
  | "waiting"
  /** There is no published profile at that handle, which is all `/@handle` says. */
  | "not-published";

export type CollaboratorLookup = {
  handle: string;
  status: CollaboratorStatus;
  /** The name on their published profile, when there is one. */
  name?: string;
};

export type CollaboratorCheck = {
  /** Your own handle, or null until you have claimed one. */
  yourHandle: string | null;
  collaborators: CollaboratorLookup[];
};

export const SELF_CREDIT_MESSAGE =
  "That’s your own profile. Credit the people you made the work with.";

export const duplicateCreditMessage = (handle: string) =>
  `You’ve already credited @${handle}.`;

/**
 * Why a list of credits cannot be saved: crediting yourself, or the same person
 * twice. Handles that are not filled in yet are skipped, so a half-typed row
 * never blocks a save.
 */
export function collaboratorIssue(
  collaborators: readonly Pick<PortfolioCollaborator, "handle">[],
  ownKeys: readonly string[],
): string | undefined {
  const own = new Set(ownKeys.map((key) => key.toLowerCase()));
  const seen = new Set<string>();
  for (const { handle } of collaborators) {
    const key = collaboratorHandleKey(handle);
    if (!key) continue;
    if (own.has(key)) return SELF_CREDIT_MESSAGE;
    if (seen.has(key)) return duplicateCreditMessage(key);
    seen.add(key);
  }
  return undefined;
}

/** Normalizes every credited handle, so what is stored is what is compared. */
export function withCollaboratorKeys(
  draft: PortfolioData,
  keyOf: (raw: string) => string | null = collaboratorHandleKey,
): PortfolioData {
  return {
    ...draft,
    collaborators: draft.collaborators.map((entry) => ({
      ...entry,
      handle: keyOf(entry.handle) ?? entry.handle.trim().replace(/^@/u, ""),
    })),
  };
}

/** The media id at the end of a stored file's address. */
export const mediaIdOf = (url: string) => url.split("/").pop() ?? "";

/**
 * What the studio preview treats as server facts. In an account the status
 * endpoint decides who is Confirmed; a device-only preview has no server, so it
 * keeps the flags its sample came with. Either way the preview applies the
 * same rule the server applies on save, so it never shows more than a visitor
 * will see.
 */
export function studioServerFacts(
  draft: PortfolioData,
  statuses: ReadonlyMap<string, CollaboratorLookup> | undefined,
): ServerFacts {
  const confirmed = new Set(
    draft.collaborators.flatMap((entry) => {
      const key = collaboratorHandleKey(entry.handle);
      if (!key) return [];
      const known = statuses?.get(key);
      return (
        known ? known.status === "confirmed" : !statuses && entry.confirmed
      )
        ? [entry.handle.toLowerCase()]
        : [];
    }),
  );
  const files = new Map(
    draft.booking.files.flatMap((file) =>
      file.type && file.bytes !== undefined
        ? [
            [
              mediaIdOf(file.file),
              { type: file.type, bytes: file.bytes },
            ] as const,
          ]
        : [],
    ),
  );
  return { confirmedHandles: confirmed, files };
}
