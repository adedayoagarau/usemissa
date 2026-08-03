import { createHmac } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

async function account(page: Page) {
  const email = `forward-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  expect((await page.request.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', displayName: 'Forward User' } })).status()).toBe(201);
  const profile = await page.request.get('/api/me/profile'); return (await profile.json()) as { id: string };
}
function signed(payload: string) { const timestamp = Math.floor(Date.now() / 1000).toString(); return { timestamp, signature: createHmac('sha256', 'local-inbound-secret-change-me').update(`${timestamp}.${payload}`).digest('hex') }; }

test('forwarding address is private, signed inbound is idempotent, and review is explicit', async ({ page }) => {
  const profile = await account(page);
  const created = await page.request.post('/api/me/email-forwarding'); expect(created.status()).toBe(201); const address = (await created.json()).address as string; expect(address).toMatch(/@track\.usemissa\.com$/);
  const second = await page.request.post('/api/me/email-forwarding'); expect(second.status()).toBe(200); expect((await second.json()).address).toBe(address);
  const opportunities = await page.request.get('/api/opportunities'); const first = ((await opportunities.json()) as { items: Array<{ id: string; title: string }> }).items[0]!; expect((await page.request.post(`/api/users/${profile.id}/track`, { data: { opportunityId: first.id } })).ok()).toBeTruthy();
  const envelope = JSON.stringify({ provider: 'fixture', providerMessageId: `e2e-${Date.now()}`, receivedAt: new Date().toISOString(), to: [address], from: 'editor@example.org', subject: `Congratulations — ${first.title}`, textBody: `Congratulations. We regret to inform you that this submission was not selected.`, headers: {}, attachments: [] }); const auth = signed(envelope);
  const inbound = await page.request.post('/api/inbound/email/forwarded', { data: envelope, headers: { 'content-type': 'application/json', 'x-missa-timestamp': auth.timestamp, 'x-missa-signature': auth.signature } }); const inboundBody = await inbound.json(); expect(inbound.status()).toBe(202); expect(inboundBody.accepted).toBe(true);
  const duplicate = await page.request.post('/api/inbound/email/forwarded', { data: envelope, headers: { 'content-type': 'application/json', 'x-missa-timestamp': auth.timestamp, 'x-missa-signature': auth.signature } }); expect(duplicate.status()).toBe(202); expect((await duplicate.json()).candidateId).toBe(inboundBody.candidateId);
  const queue = await page.request.get('/api/me/email-candidates'); expect(queue.ok()).toBeTruthy(); const candidate = ((await queue.json()) as { candidates: Array<{ id: string; classification: string; state: string }> }).candidates[0]!; expect(candidate.state).toBe('pending');
  const review = await page.request.post(`/api/me/email-candidates/${candidate.id}/review`, { data: { kind: 'confirm', opportunityId: first.id, idempotencyKey: `${candidate.id}-review`, status: 'declined' } }); expect(review.ok()).toBeTruthy();
  const tracker = await page.request.get(`/api/users/${profile.id}/tracker`); expect(JSON.stringify(await tracker.json())).toContain('declined');
  const unauth = await page.request.post('/api/inbound/email/forwarded', { data: envelope }); expect(unauth.status()).toBe(401);
});

test('unknown signed recipients return a generic unavailable response', async ({ page }) => {
  await account(page); const envelope = JSON.stringify({ provider: 'fixture', providerMessageId: `unknown-${Date.now()}`, receivedAt: new Date().toISOString(), to: ['not-a-real-token@track.usemissa.com'], subject: 'Hello', textBody: 'Hello', headers: {}, attachments: [] }); const auth = signed(envelope); const response = await page.request.post('/api/inbound/email/forwarded', { data: envelope, headers: { 'content-type': 'application/json', 'x-missa-timestamp': auth.timestamp, 'x-missa-signature': auth.signature } }); expect(response.status()).toBe(202); expect(await response.json()).toEqual({ accepted: false, reason: 'unavailable' });
});
