/**
 * Intake screening for one opportunity. Every check produces a flag with a
 * plain reason for a person to look at; nothing here declines, hides or
 * reorders a submission. Withdrawn submissions are ignored.
 */

export interface EligibilityRules {
  /** Most Works one submission may contain. */
  maxWorks?: number;
  /** Categories this opportunity accepts; empty or absent means any. */
  allowedCategories?: string[];
  /** Every Work must carry at least one file. */
  requireFiles?: boolean;
  /** Most submissions one person may send to this opportunity. */
  maxSubmissionsPerSubmitter?: number;
}

export type IntakeFlagCode =
  | 'repeat-submitter'
  | 'duplicate-title'
  | 'duplicate-file'
  | 'too-many-works'
  | 'category-not-accepted'
  | 'missing-file';

export interface IntakeFlag {
  code: IntakeFlagCode;
  message: string;
  relatedSubmissionIds?: string[];
}

export interface IntakeSubmission {
  id: string;
  submitterAccountId: string;
  status: string;
  category?: string;
  submittedAt: string;
  works: Array<{ title: string; fileUrl?: string; fileUrls?: string[] }>;
}

function normalizeTitle(title: string): string {
  return title.toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function filesOf(work: IntakeSubmission['works'][number]): string[] {
  return [...new Set([...(work.fileUrls ?? []), ...(work.fileUrl ? [work.fileUrl] : [])])];
}

export function intakeFlags(submissions: IntakeSubmission[], rules: EligibilityRules = {}): Map<string, IntakeFlag[]> {
  const active = submissions.filter((submission) => submission.status !== 'withdrawn');
  const flags = new Map<string, IntakeFlag[]>(active.map((submission) => [submission.id, []]));
  const add = (submissionId: string, flag: IntakeFlag) => flags.get(submissionId)?.push(flag);

  const bySubmitter = new Map<string, IntakeSubmission[]>();
  for (const submission of active) bySubmitter.set(submission.submitterAccountId, [...(bySubmitter.get(submission.submitterAccountId) ?? []), submission]);
  const limit = rules.maxSubmissionsPerSubmitter ?? 1;
  for (const group of bySubmitter.values()) {
    if (group.length <= limit) continue;
    const ordered = [...group].sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
    for (const [index, submission] of ordered.entries()) {
      add(submission.id, { code: 'repeat-submitter', message: `This person has ${group.length} submissions to this opportunity${rules.maxSubmissionsPerSubmitter ? `; the limit is ${limit}` : ''}. This is number ${index + 1}.`, relatedSubmissionIds: ordered.filter((other) => other.id !== submission.id).map((other) => other.id) });
    }
  }

  const byTitle = new Map<string, Set<string>>();
  const byFile = new Map<string, Set<string>>();
  for (const submission of active) {
    for (const work of submission.works) {
      const title = normalizeTitle(work.title);
      if (title.length >= 4) byTitle.set(title, new Set([...(byTitle.get(title) ?? []), submission.id]));
      for (const file of filesOf(work)) byFile.set(file, new Set([...(byFile.get(file) ?? []), submission.id]));
    }
  }
  const owner = new Map(active.map((submission) => [submission.id, submission.submitterAccountId]));
  for (const ids of byTitle.values()) {
    const people = new Set([...ids].map((id) => owner.get(id)));
    if (ids.size < 2 || people.size < 2) continue;
    for (const id of ids) add(id, { code: 'duplicate-title', message: 'A Work with the same title was sent by someone else.', relatedSubmissionIds: [...ids].filter((other) => other !== id) });
  }
  for (const ids of byFile.values()) {
    if (ids.size < 2) continue;
    for (const id of ids) add(id, { code: 'duplicate-file', message: 'The same file appears in another submission.', relatedSubmissionIds: [...ids].filter((other) => other !== id) });
  }

  for (const submission of active) {
    if (rules.maxWorks !== undefined && submission.works.length > rules.maxWorks) add(submission.id, { code: 'too-many-works', message: `${submission.works.length} Works sent; this opportunity accepts up to ${rules.maxWorks}.` });
    const allowed = rules.allowedCategories?.filter(Boolean) ?? [];
    if (allowed.length && submission.category && !allowed.some((category) => category.toLocaleLowerCase('en') === submission.category!.toLocaleLowerCase('en'))) add(submission.id, { code: 'category-not-accepted', message: `Category “${submission.category}” is not one this opportunity accepts.` });
    if (rules.requireFiles) {
      const missing = submission.works.filter((work) => filesOf(work).length === 0).length;
      if (missing) add(submission.id, { code: 'missing-file', message: `${missing} ${missing === 1 ? 'Work has' : 'Works have'} no file attached.` });
    }
  }

  // De-duplicate flags of the same code per submission (a title and file can match the same pair).
  for (const [id, list] of flags) {
    const seen = new Set<string>();
    flags.set(id, list.filter((flag) => { const key = `${flag.code}:${(flag.relatedSubmissionIds ?? []).join(',')}`; if (seen.has(key)) return false; seen.add(key); return true; }));
  }
  return flags;
}
