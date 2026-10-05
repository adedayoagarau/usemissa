import { calendarDaysUntil } from "./deadlineLabel.ts";

/**
 * Similar open calls for recovery after a decline or a missed deadline, and
 * for planning from any record. Deterministic, explained, and never presented
 * as AI: every result carries the plain reasons it was chosen.
 */
export type SimilarReason = "declined" | "missed" | "record";

export type SimilarAnchor = {
  id: string;
  title: string;
  type: string;
  discipline: string | null;
  genres: string[];
  organizationId: string | null;
  programId: string | null;
  feeStatus: string | null;
};

export type SimilarCandidate = {
  id: string;
  title: string;
  type: string;
  discipline: string | null;
  genres: string[];
  organizationId: string | null;
  organizationName: string;
  programId: string | null;
  feeStatus: string | null;
  deadline: string | null;
  deadlineKind: string;
  /** Weighted overlap of taxonomy terms with the anchor (primary and confirmed count more). */
  termScore: number;
  /** Labels of the shared taxonomy terms, strongest first. */
  sharedTerms: string[];
};

export type SimilarMatch = {
  id: string;
  title: string;
  organizationName: string;
  deadline: string | null;
  deadlineKind: string;
  score: number;
  reasons: string[];
};

const TYPE_LABELS: Record<string, string> = { "open-call": "open call" };
const typeLabel = (type: string) =>
  TYPE_LABELS[type] ?? type.replaceAll("-", " ");
const FREE = new Set(["free", "no-fee", "none"]);

function listLabel(values: string[]): string {
  const shown = values.slice(0, 2);
  return shown.length === 2 ? `${shown[0]} and ${shown[1]}` : (shown[0] ?? "");
}

export function scoreSimilar({
  anchor,
  candidates,
  reason,
  minimumPreparationDays = 7,
  limit = 6,
  now = new Date(),
}: {
  anchor: SimilarAnchor;
  candidates: ReadonlyArray<SimilarCandidate>;
  reason: SimilarReason;
  /** Calls closing sooner than this are left out: there is no realistic time to prepare. */
  minimumPreparationDays?: number;
  limit?: number;
  now?: Date;
}): SimilarMatch[] {
  const scored: SimilarMatch[] = [];
  for (const candidate of candidates) {
    if (candidate.id === anchor.id) continue;
    const days =
      candidate.deadline && candidate.deadlineKind !== "rolling"
        ? calendarDaysUntil(candidate.deadline.slice(0, 10), now)
        : null;
    if (days !== null && days < minimumPreparationDays) continue;

    const reasons: string[] = [];
    let score = Math.min(candidate.termScore, 12) * 4;
    if (candidate.sharedTerms.length)
      reasons.push(
        `Shares ${listLabel(candidate.sharedTerms)} with ${anchor.title}`,
      );

    const sharedGenres = candidate.genres.filter((genre) =>
      anchor.genres.includes(genre),
    );
    if (sharedGenres.length) {
      score += 6 * Math.min(sharedGenres.length, 3);
      if (!candidate.sharedTerms.length)
        reasons.push(`Also ${listLabel(sharedGenres)}`);
    }
    if (anchor.discipline && candidate.discipline === anchor.discipline)
      score += 4;
    if (candidate.type === anchor.type) {
      score += 8;
      reasons.push(`Same kind of call: ${typeLabel(candidate.type)}`);
    }

    const sameProgram = Boolean(
      anchor.programId && candidate.programId === anchor.programId,
    );
    const sameOrganization = Boolean(
      anchor.organizationId &&
      candidate.organizationId === anchor.organizationId,
    );
    if (reason === "missed" && sameProgram) {
      score += 40;
      reasons.unshift("The next round of the call you missed");
    } else if (reason === "declined" && sameOrganization) {
      // After a decline, look wider first; the same organization stays possible.
      score -= 10;
    } else if (sameOrganization) {
      score += 4;
      reasons.push(`Also from ${candidate.organizationName}`);
    }

    if (candidate.feeStatus && FREE.has(candidate.feeStatus)) {
      score += 3;
      reasons.push("Free to submit");
    }
    if (days === null) {
      reasons.push(
        candidate.deadlineKind === "rolling"
          ? "Rolling deadline"
          : "Deadline not listed",
      );
    } else {
      // Prefer calls with comfortable preparation time over ones far away.
      score += days <= 60 ? 6 : days <= 120 ? 3 : 0;
      reasons.push(`Closes in ${days} days, enough time to prepare`);
    }

    // Only show matches that share something meaningful with the anchor.
    if (
      !candidate.sharedTerms.length &&
      !sharedGenres.length &&
      !(reason === "missed" && sameProgram)
    )
      continue;
    scored.push({
      id: candidate.id,
      title: candidate.title,
      organizationName: candidate.organizationName,
      deadline: candidate.deadline,
      deadlineKind: candidate.deadlineKind,
      score,
      reasons: reasons.slice(0, 3),
    });
  }

  // At most two calls from one organization, so a list is never one publisher.
  const perOrganization = new Map<string, number>();
  return scored
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .filter((match) => {
      const key = match.organizationName || match.id;
      const count = perOrganization.get(key) ?? 0;
      if (count >= 2) return false;
      perOrganization.set(key, count + 1);
      return true;
    })
    .slice(0, limit);
}
