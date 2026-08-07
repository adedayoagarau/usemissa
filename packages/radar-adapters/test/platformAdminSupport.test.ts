import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePlatformAdminSupportCase, summarizePlatformAdminSupportCases } from '../src/platformAdminSupport.js';

test('support read model normalizes legacy in_progress status and preserves useful references', () => {
  const row = normalizePlatformAdminSupportCase({
    id: 'issue_one',
    account_id: 'acct_one',
    account_email: 'person@example.com',
    opportunity_id: 'opp_one',
    opportunity_title: 'Poetry call',
    opportunity_slug: 'poetry-call',
    reason: 'closed-or-expired',
    note: 'This call is no longer accepting work.',
    status: 'in_progress',
    created_at: new Date('2026-08-05T10:00:00.000Z'),
    updated_at: '2026-08-05T11:00:00.000Z',
  });

  assert.equal(row.status, 'in-progress');
  assert.equal(row.accountEmail, 'person@example.com');
  assert.equal(row.opportunityTitle, 'Poetry call');
  assert.equal(row.createdAt, '2026-08-05T10:00:00.000Z');
});

test('support summary groups statuses without claiming missing rows are healthy', () => {
  const summary = summarizePlatformAdminSupportCases([
    { id: 'one', accountId: 'a', opportunityId: 'o', reason: 'other', status: 'open' },
    { id: 'two', accountId: 'a', opportunityId: 'o', reason: 'other', status: 'in-progress' },
    { id: 'three', accountId: 'a', opportunityId: 'o', reason: 'other', status: 'resolved' },
  ]);

  assert.deepEqual(summary, { total: 3, byStatus: { open: 1, 'in-progress': 1, resolved: 1 } });
});
