import type { WorkspaceStore } from "./store/store.js";

export interface WorkspaceAccountErasureResult {
  retainedSubmissions: number;
  retainedCompletedReviews: number;
  removedDrafts: number;
  removedOpenReviewAssignments: number;
  removedDraftAssetUrls: string[];
}

function assetUrls(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      if (
        url.protocol === "https:" &&
        url.hostname.endsWith(".blob.vercel-storage.com")
      )
        return [url.toString()];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) return value.flatMap(assetUrls);
  if (value && typeof value === "object")
    return Object.values(value as Record<string, unknown>).flatMap(assetUrls);
  return [];
}

export function workspaceAccountDraftAssetUrls(
  store: WorkspaceStore,
  accountId: string,
): string[] {
  const urls = new Set<string>();
  for (const draft of store.submissionDrafts.values()) {
    if (draft.submitterAccountId !== accountId) continue;
    for (const url of assetUrls(draft.answers)) urls.add(url);
  }
  return [...urls];
}

/**
 * Remove unfinished account-owned work from the organization workflow.
 * Submitted applications and completed reviews remain as organization records;
 * their account reference points to the deidentified Radar account tombstone.
 */
export function eraseWorkspaceAccountData(
  store: WorkspaceStore,
  accountId: string,
): WorkspaceAccountErasureResult {
  const retainedSubmissions = [...store.submissions.values()].filter(
    (submission) => submission.submitterAccountId === accountId,
  ).length;
  let removedDrafts = 0;
  const removedDraftAssetUrls = workspaceAccountDraftAssetUrls(
    store,
    accountId,
  );
  for (const [id, draft] of store.submissionDrafts) {
    if (draft.submitterAccountId !== accountId) continue;
    store.submissionDrafts.delete(id);
    removedDrafts += 1;
  }

  let retainedCompletedReviews = 0;
  let removedOpenReviewAssignments = 0;
  for (const [id, assignment] of store.reviewAssignments) {
    if (assignment.reviewerAccountId !== accountId) continue;
    if (assignment.completedAt) {
      retainedCompletedReviews += 1;
      continue;
    }
    store.reviewAssignments.delete(id);
    store.reviewRecommendations.delete(id);
    removedOpenReviewAssignments += 1;
  }

  return {
    retainedSubmissions,
    retainedCompletedReviews,
    removedDrafts,
    removedOpenReviewAssignments,
    removedDraftAssetUrls,
  };
}
