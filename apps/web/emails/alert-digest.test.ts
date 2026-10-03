import test from 'node:test';
import assert from 'node:assert/strict';
import type { Alert } from '@missa/radar-engine';
import { renderAlertDigestEmail } from './alert-digest';

const now = new Date('2026-10-04T18:00:00Z');
const alert = (id: string, kind: Alert['kind'], reason: string, opportunityId?: string): Alert => ({
  id,
  audience: 'user',
  userId: 'user_1',
  kind,
  opportunityId,
  title: `Alert ${id}`,
  body: 'Fixture',
  reason,
  createdAt: now.toISOString(),
  read: false,
});
const known: Record<string, { title: string; organizationName: string; deadline: string | null }> = {
  opp_residency: { title: 'Fall Writing Residency', organizationName: 'Vermont Studio Center', deadline: '2026-12-01' },
  opp_poets: { title: 'Residency for Poets', organizationName: 'Millay Arts', deadline: '2027-01-09' },
  opp_hedgebrook: { title: 'Writers in Residence 2027', organizationName: 'Hedgebrook', deadline: '2027-02-15' },
};
const opportunity = (id: string) =>
  known[id] && {
    opportunityId: id,
    ...known[id]!,
    type: 'residency',
    feeStatus: 'no-fee',
    feeCents: null,
    feeCurrency: null,
    prize: null,
  };
const render = (alerts: Alert[]) => renderAlertDigestEmail({ alerts, accountId: 'acc_1', email: 'creator@example.com', opportunity, now });

test('Selected for you groups saved-search and followed-organisation calls and links each label', () => {
  const rendered = render([
    alert('a1', 'new-match', 'matches your saved search "Poetry residencies" (discipline: poetry)', 'opp_residency'),
    alert('a2', 'new-match', 'matches your saved search "Poetry residencies" (type: residency)', 'opp_poets'),
    alert('a3', 'followed-org-new-call', 'you follow this organization', 'opp_hedgebrook'),
  ]);
  assert.equal(rendered.subject, 'Selected for you: three new calls');
  assert.ok(
    rendered.html.includes('Two new calls match your saved search for poetry residencies, and Hedgebrook, an organisation you follow, posted a new call.'),
  );
  assert.ok(rendered.html.includes('From your saved search'));
  assert.ok(rendered.html.includes('From organisations you follow'));
  assert.ok(rendered.html.includes('You follow Hedgebrook'));
  assert.ok(rendered.html.includes('Residency · Free to enter'));
  for (const id of ['opp_residency', 'opp_poets', 'opp_hedgebrook']) assert.match(rendered.html, new RegExp(`/opportunities/${id}" style="display:block;`));
  assert.ok(rendered.text.includes('Fall Writing Residency, Vermont Studio Center'));
});

test('changes to followed calls get their own section, and unknown calls never claim a deadline', () => {
  const rendered = render([alert('u1', 'deadline-extended', 'you saved this', 'opp_missing')]);
  assert.equal(rendered.subject, 'Selected for you: Alert u1');
  assert.ok(rendered.html.includes('Updates on calls you follow'));
  assert.ok(rendered.html.includes('You saved this'));
  assert.ok(!rendered.html.includes('No fixed deadline'));
  assert.ok(rendered.html.includes('/inbox" style="display:block;'));
});

test('Selected for you escapes alert text and keeps Forest text light in Gmail dark mode', () => {
  const rendered = render([{ ...alert('x', 'new-match', 'matches your saved search "<b>x</b>"'), title: '<script>alert(1)</script>' }]);
  assert.ok(!rendered.html.includes('<script>alert(1)</script>'));
  assert.ok(!rendered.html.includes('<b>x</b>'));
  assert.ok(rendered.html.includes('gmail-blend-screen'));
});
