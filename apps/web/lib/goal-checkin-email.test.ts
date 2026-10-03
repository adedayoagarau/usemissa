import test from 'node:test';
import assert from 'node:assert/strict';
import { goalCheckInEmailKey, pendingGoalCheckInEmails } from './goal-checkin-email';

test('pending goal check-ins skip goals already met and select only recent, unsent goal notices', async () => {
  let sql = '';
  const pool = {
    async query(text: string) {
      sql = text;
      const row = (alert: string, progress: number) => ({
        alert_id: alert,
        account_id: 'acc_1',
        email: 'creator@example.com',
        given_name: 'Tola',
        goal_id: 'goal_1',
        progress,
        target: 10,
        ends_on: '2026-12-31',
        next_step: null,
        closing: [],
        closing_count: 0,
      });
      return { rows: [row('alert_open', 4), row('alert_met', 10)] };
    },
  };
  const rows = await pendingGoalCheckInEmails(pool as never);
  assert.deepEqual(rows.map((row) => row.alertId), ['alert_open']);
  assert.match(sql, /a\.dedupe_key like 'goal:%'/);
  assert.match(sql, /p\.email_enabled and p\.reminder_enabled/);
  assert.match(sql, /e\.idempotency_key='creator-goal:'\|\|a\.id and e\.status<>'failed'/);
  assert.equal(goalCheckInEmailKey('alert_open'), 'creator-goal:alert_open');
});
