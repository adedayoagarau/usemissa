import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Alert, AlertKind } from '@missa/radar-engine';

import { InboxProduct, type InboxProductGroup, type InboxProductItem } from '@/components/inbox-product';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

type SearchParams = Record<string, string | string[] | undefined>;

const categories: Record<AlertKind, string> = {
  'new-match': 'Saved search',
  'opening-soon': 'Opening window',
  'closing-soon': 'Deadline',
  'deadline-extended': 'Opportunity change',
  'deadline-changed': 'Opportunity change',
  'fee-changed': 'Opportunity change',
  'eligibility-changed': 'Opportunity change',
  'call-reopened': 'Opportunity change',
  'call-closed': 'Opportunity change',
  'page-gone': 'Opportunity availability',
  'expected-reopen': 'Expected opening window',
  'deadline-reminder': 'Tracker reminder',
  'response-overdue': 'Submission follow-up',
  'withdrawal-suggested': 'Submission action',
  'followed-org-new-call': 'Organization you follow',
  'submission-receipt': 'Submission receipt',
  'submission-decision': 'Submission decision',
  'claim-invite': 'Organization invitation',
  'verification-needed': 'Verification',
};

function groupFor(kind: AlertKind): InboxProductGroup {
  if (['submission-decision', 'deadline-reminder', 'response-overdue', 'withdrawal-suggested'].includes(kind)) return 'attention';
  if (['deadline-extended', 'deadline-changed', 'fee-changed', 'eligibility-changed', 'call-reopened', 'call-closed', 'page-gone'].includes(kind)) return 'changes';
  if (kind === 'submission-receipt') return 'submissions';
  return 'discovery';
}

function safeSummary(alert: Alert): string {
  if (alert.kind === 'new-match') return 'This Opportunity may fit the preferences you saved.';
  if (alert.kind === 'followed-org-new-call') return 'A new Opportunity is available from an Organization you follow.';
  if (alert.kind === 'opening-soon') return 'Review the opening window before you begin preparing.';
  if (alert.kind === 'expected-reopen') return 'This expected window is based on the Opportunity’s previous opening pattern.';
  if (alert.kind === 'closing-soon' || alert.kind === 'deadline-reminder') return 'Review the deadline and your next preparation step.';
  if (['deadline-extended', 'deadline-changed', 'fee-changed', 'eligibility-changed', 'call-reopened', 'call-closed', 'page-gone'].includes(alert.kind)) return 'A material detail on the Opportunity has changed. Review the current record before acting.';
  if (alert.kind === 'response-overdue') return 'It may be time to follow up or update your private Tracker record.';
  if (alert.kind === 'withdrawal-suggested') return 'One accepted submission may affect other active submissions for the same Work.';
  if (alert.kind === 'submission-receipt' || alert.kind === 'submission-decision') return alert.body;
  return 'Open the related record to review this update.';
}

function safeReason(alert: Alert): string {
  if (alert.kind === 'new-match') return 'It matches a search or preference you saved.';
  if (alert.kind === 'followed-org-new-call') return 'You follow this Organization.';
  if (alert.kind === 'submission-receipt' || alert.kind === 'submission-decision') return 'This belongs to a submission you made through Missa.';
  if (alert.kind === 'deadline-reminder') return 'You chose reminders for this Tracker item.';
  if (alert.kind === 'response-overdue') return 'This submission is still waiting for a response.';
  if (alert.kind === 'withdrawal-suggested') return 'An accepted submission may require a decision about other active submissions.';
  if (alert.reason.toLowerCase().includes('follow')) return 'You follow the Organization behind this Opportunity.';
  return 'This Opportunity is in your Tracker.';
}

function actionFor(alert: Alert): Pick<InboxProductItem, 'actionHref' | 'actionLabel'> {
  if (alert.kind === 'submission-receipt' || alert.kind === 'submission-decision') return { actionHref: '/tracker?view=submissions', actionLabel: alert.kind === 'submission-decision' ? 'View decision' : 'View submissions' };
  if (['deadline-reminder', 'response-overdue', 'withdrawal-suggested'].includes(alert.kind)) return { actionHref: '/tracker', actionLabel: 'Open Tracker' };
  if (alert.opportunityId) return { actionHref: `/opportunities/${encodeURIComponent(alert.opportunityId)}`, actionLabel: 'View Opportunity' };
  return { actionHref: '/opportunities', actionLabel: 'Browse Opportunities' };
}

function toProductItem(alert: Alert): InboxProductItem {
  return {
    id: alert.id,
    kind: alert.kind,
    group: groupFor(alert.kind),
    category: categories[alert.kind],
    title: alert.title,
    summary: safeSummary(alert),
    reason: safeReason(alert),
    createdAt: alert.createdAt,
    unread: !alert.read,
    ...actionFor(alert),
  };
}

export default async function InboxPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login?next=/inbox');

  const raw = searchParams ? await searchParams : {};
  const requestedView = Array.isArray(raw.view) ? raw.view[0] : raw.view;
  const engine = await getEngine();
  const items = [...engine.store.alerts.values()]
    .filter((alert) => alert.audience === 'user' && alert.userId === session.account.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toProductItem);

  return <InboxProduct initialItems={items} initialView={requestedView === 'email' ? 'email' : 'briefing'} />;
}
