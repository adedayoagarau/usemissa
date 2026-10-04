import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Alert, AlertKind } from '@missa/radar-engine';
import {
  creatorFeatures,
  creatorPlan,
  creatorPoolFor,
  getPlanningPreferences,
  planningPreferencesAvailable,
  type CreatorInboxAlertView,
  type CreatorPlanningPreferences,
} from '@missa/radar-adapters';

import { InboxProduct, type InboxProductGroup, type InboxProductItem } from '@/components/inbox-product';
import type { DeadlinePlanFeatures } from '@/components/notification-preferences-panel';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { CreatorReminderRepository } from '@/lib/creator-reminders';
import { getEngine } from '@/lib/engine';
import { getCreatorInboxRepository } from '@/lib/creatorRepositories';
import { notificationPreferencesView } from '@/lib/sms-preferences';
import { changeNoticeSummary, deadlineNoticeView, isDeadlineNoticeKind } from '@/lib/inbox-notice-kinds';

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

type InboxSourceAlert = Pick<Alert, 'id' | 'kind' | 'title' | 'body' | 'reason' | 'createdAt' | 'opportunityId'> & {
  read: boolean;
  revision?: number;
  /** The notice's own link, from the relational Inbox. */
  actionHref?: string | null;
  /** Relational notices are written as customer copy, so change notices can show their own was/now text. */
  relational?: boolean;
};

function goalHref(alert: InboxSourceAlert): string | undefined {
  const id = /^Goal check-in · \/goals\?goal=([0-9a-f-]{36})$/i.exec(alert.reason)?.[1];
  return id ? `/goals?goal=${id}` : undefined;
}

function safeSummary(alert: InboxSourceAlert): string {
  if (goalHref(alert)) return alert.body;
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

function safeReason(alert: InboxSourceAlert): string {
  if (goalHref(alert)) return "You scheduled a check-in for this goal.";
  if (alert.kind === 'new-match') return 'It matches a search or preference you saved.';
  if (alert.kind === 'followed-org-new-call') return 'You follow this Organization.';
  if (alert.kind === 'submission-receipt' || alert.kind === 'submission-decision') return 'This belongs to a submission you made through Missa.';
  if (alert.kind === 'deadline-reminder') return 'You chose reminders for this Tracker item.';
  if (alert.kind === 'response-overdue') return 'This submission is still waiting for a response.';
  if (alert.kind === 'withdrawal-suggested') return 'An accepted submission may require a decision about other active submissions.';
  if (alert.reason.toLowerCase().includes('follow')) return 'You follow the Organization behind this Opportunity.';
  return 'This Opportunity is in your Tracker.';
}

function actionFor(alert: InboxSourceAlert): Pick<InboxProductItem, 'actionHref' | 'actionLabel'> {
  const goal = goalHref(alert);
  if (goal) return { actionHref: goal, actionLabel: 'Open goal' };
  if (alert.kind === 'submission-receipt' || alert.kind === 'submission-decision') return { actionHref: '/tracker?view=submissions', actionLabel: alert.kind === 'submission-decision' ? 'View decision' : 'View submissions' };
  if (['deadline-reminder', 'response-overdue', 'withdrawal-suggested'].includes(alert.kind)) return { actionHref: '/tracker', actionLabel: 'Open Tracker' };
  if (alert.opportunityId) return { actionHref: `/opportunities/${encodeURIComponent(alert.opportunityId)}`, actionLabel: 'View Opportunity' };
  return { actionHref: '/opportunities', actionLabel: 'Browse Opportunities' };
}

function toProductItem(alert: InboxSourceAlert): InboxProductItem {
  // Deadline-management notices (and kinds this page does not know yet) are
  // stored as strings wider than the engine's AlertKind.
  const kind: string = alert.kind;
  if (isDeadlineNoticeKind(kind)) {
    return {
      id: alert.id,
      kind,
      ...deadlineNoticeView({ kind, title: alert.title, body: alert.body, opportunityId: alert.opportunityId, actionHref: alert.actionHref }),
      createdAt: alert.createdAt,
      unread: !alert.read,
      revision: alert.revision,
    };
  }
  const changeSummary = alert.relational ? changeNoticeSummary(kind, alert.body) : null;
  return {
    id: alert.id,
    kind: alert.kind,
    group: groupFor(alert.kind),
    category: goalHref(alert) ? "Goal check-in" : (categories[alert.kind] ?? 'Update'),
    title: alert.title,
    summary: changeSummary ?? safeSummary(alert),
    reason: safeReason(alert),
    createdAt: alert.createdAt,
    unread: !alert.read,
    revision: alert.revision,
    ...actionFor(alert),
  };
}

/**
 * Planning preferences and the plan's deadline features for the Deadlines
 * settings; absent without a database or before migration 0088, so the
 * section is hidden rather than shown with saves that cannot succeed.
 */
async function deadlineSettings(accountId: string): Promise<{ preferences: CreatorPlanningPreferences | null; features: DeadlinePlanFeatures }> {
  if (!process.env.DATABASE_URL) return { preferences: null, features: {} };
  const pool = creatorPoolFor(process.env.DATABASE_URL);
  const [preferences, plan] = await Promise.all([
    planningPreferencesAvailable(pool)
      .then((available) => (available ? getPlanningPreferences(pool, accountId) : null))
      .catch(() => null),
    creatorPlan(pool, accountId).catch(() => 'free' as const),
  ]);
  const features = creatorFeatures(plan);
  return { preferences, features: { deadlineDayAlarm: features.deadlineDayAlarm, openingAlerts: features.openingAlerts } };
}

export default async function InboxPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login?next=/inbox');

  const raw = searchParams ? await searchParams : {};
  const requestedView = Array.isArray(raw.view) ? raw.view[0] : raw.view;
  const repository = getCreatorInboxRepository();
  const links = repository ? await new CreatorReminderRepository().inboxLinks(session.account.id) : [];
  const items = repository
    ? (await repository.alerts(session.account.id)).map((alert: CreatorInboxAlertView) =>
        toProductItem({ ...alert, read: Boolean(alert.readAt), relational: true, actionHref: links.find((link) => link.id === alert.id)?.href ?? null }))
    : [...(await getEngine()).store.alerts.values()]
        .filter((alert) => alert.audience === 'user' && alert.userId === session.account.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toProductItem);

  if (repository) {
    for (const item of items) {
      const link = links.find(l => l.id === item.id);
      if (isDeadlineNoticeKind(item.kind)) {
        // Their own link and copy already apply; a reminder behind the notice can still be snoozed.
        item.reminderId = link?.reminderId ?? undefined;
        continue;
      }
      // Change notices link to the Tracker too, but keep their own category and reason.
      if (link?.href.startsWith('/tracker?') && item.group === 'changes') { item.actionHref = link.href; item.actionLabel = 'Open application'; continue; }
      if (link?.href.startsWith('/tracker?')) { item.actionHref = link.href; item.actionLabel = 'Open application'; item.reminderId = link.reminderId ?? undefined; item.reason = 'You scheduled this reminder.'; item.category = item.kind === 'response-overdue' ? 'Response check-in' : 'Application reminder'; }
      if (link?.href.startsWith('/opportunities/') && item.kind === 'followed-org-new-call') { item.actionHref = link.href; item.actionLabel = 'View opportunity'; item.reason = link.reason; item.summary = link.body; item.category = 'Following'; }
    }
  }
  const initialPreferences = await notificationPreferencesView(session.account.id);
  const planning = await deadlineSettings(session.account.id);
  return <InboxProduct initialItems={items} initialPreferences={initialPreferences} initialPlanning={planning.preferences} planFeatures={planning.features} initialView={requestedView === 'email' ? 'email' : requestedView === 'reminders' ? 'reminders' : 'briefing'} />;
}
