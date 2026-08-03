import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, FixtureFetcher, RadarEngine, type Opportunity } from '../src/index.js';

function opportunity(id: string, title: string, organizationName: string): Opportunity {
  return { id, createdAt: '2026-01-01T00:00:00.000Z', status: 'open', fields: { title, organizationName, type: 'magazine', genres: ['poetry'], deadline: { kind: 'exact', date: '2026-12-01' }, fee: { disclosed: true, amountCents: 0 }, eligibility: [], requiredMaterials: [], contactEmailPresent: false }, sourceId: 'source', sourceUrl: `https://example.test/${id}`, alternateSourceIds: [], scores: { freshness: 100, confidence: 100, trust: 100 }, trustSignals: [], lastCheckedAt: '2026-01-01T00:00:00.000Z', lastChangedAt: '2026-01-01T00:00:00.000Z', lastExtractionConfidence: 100, lastOpenSignal: true, lastClosedSignal: false, lastSuspiciousSignals: [], pastCycles: [], conflicts: [] };
}

test('forwarding lifecycle is opaque, one-active, and rotation revokes the old address', () => {
  const engine = new RadarEngine({ store: createStore(), fetcher: new FixtureFetcher() });
  engine.addUser({ id: 'email_user', displayName: 'Email User', genres: [], attributes: {} });
  const first = engine.createForwardingAddress('email_user');
  assert.match(first.address, /^[A-Za-z0-9]{20,}@track\.usemissa\.com$/);
  assert.equal(first.created, true);
  assert.equal(engine.createForwardingAddress('email_user').created, false);
  assert.equal(engine.store.forwardingAddresses.length, 1);
  const rotated = engine.rotateForwardingAddress('email_user', 'rotate-1');
  assert.notEqual(rotated.address, first.address);
  assert.equal(engine.rotateForwardingAddress('email_user', 'rotate-1').address, rotated.address);
  assert.equal(engine.store.forwardingAddresses.filter((item) => item.status === 'active').length, 1);
  assert.equal(engine.store.forwardingAddresses.find((item) => item.status === 'revoked')?.tokenHash.includes(first.address.split('@')[0] ?? ''), false);
  engine.setForwardingAddressStatus('email_user', 'paused');
  const result = engine.ingestInboundEmail({ provider: 'fixture', providerMessageId: 'paused-1', receivedAt: new Date().toISOString(), to: [rotated.address], from: 'editor@example.org', subject: 'Submission received', textBody: 'Thank you for your submission.', headers: {}, attachments: [] });
  assert.deepEqual(result, { accepted: false, reason: 'unavailable' });
});

test('signed-envelope domain creates a private review candidate and retries are idempotent', () => {
  const store = createStore(); const engine = new RadarEngine({ store, fetcher: new FixtureFetcher() });
  engine.addUser({ id: 'email_user', displayName: 'Email User', genres: [], attributes: {} });
  const opp = opportunity('opp_email', 'North River Review', 'North River'); store.opportunities.set(opp.id, opp); store.tracked.push({ userId: 'email_user', opportunityId: opp.id, trackedAt: '2026-08-01T00:00:00.000Z', notify: true, myStatus: 'submitted', events: [] });
  const address = engine.createForwardingAddress('email_user').address;
  const envelope = { provider: 'fixture', providerMessageId: 'message-1', receivedAt: '2026-08-02T00:00:00.000Z', to: [address], from: 'editor@north-river.org', subject: 'North River Review — Submission received', textBody: 'Thank you for your submission. It is now under review.', htmlBody: '<script>alert(1)</script><p>Thank you for your submission.</p>', headers: {}, attachments: [{ filename: '../danger.exe', contentType: 'application/x-msdownload', byteLength: 12 }] };
  const first = engine.ingestInboundEmail(envelope); const duplicate = engine.ingestInboundEmail(envelope);
  assert.equal(first.accepted, true); assert.equal(duplicate.candidateId, first.candidateId); assert.equal(store.emailCandidates.length, 1);
  const candidate = store.emailCandidates[0]!; assert.equal(candidate.bodyExcerpt.includes('alert'), false); assert.equal(candidate.attachmentMetadata[0]?.filename.includes('..'), false); assert.equal(candidate.attachmentMetadata[0]?.unsafe, true);
  const before = store.tracked[0]!.myStatus; const review = engine.reviewEmailCandidate('email_user', candidate.id, { kind: 'confirm', opportunityId: opp.id, status: 'in-review', idempotencyKey: 'review-1' });
  assert.equal(review.mutation.trackerUpdated, true); assert.equal(store.tracked[0]!.myStatus, 'in-review'); assert.equal(store.tracked[0]!.events[0]?.source, 'email'); assert.equal(store.tracked[0]!.events[0]?.candidateId, candidate.id); assert.notEqual(before, store.tracked[0]!.myStatus);
  const replay = engine.reviewEmailCandidate('email_user', candidate.id, { kind: 'confirm', opportunityId: opp.id, status: 'in-review', idempotencyKey: 'review-1' }); assert.deepEqual(replay.mutation, review.mutation); assert.equal(store.tracked[0]!.events.length, 1);
});

test('unmatched email requires a private manual entry and sensitive proposals require explicit status', () => {
  const engine = new RadarEngine({ store: createStore(), fetcher: new FixtureFetcher() }); engine.addUser({ id: 'email_user', displayName: 'Email User', genres: [], attributes: {} }); const address = engine.createForwardingAddress('email_user').address;
  const result = engine.ingestInboundEmail({ provider: 'fixture', providerMessageId: 'message-2', receivedAt: '2026-08-02T00:00:00.000Z', to: [address], from: 'editor@unknown.org', subject: 'Congratulations', textBody: 'Congratulations — you have been selected.', headers: {}, attachments: [] }); assert.equal(result.accepted, true);
  const candidate = engine.store.emailCandidates[0]!; assert.equal(candidate.classification, 'unmatched'); assert.throws(() => engine.reviewEmailCandidate('email_user', candidate.id, { kind: 'create-manual', title: 'Unknown Call', organizationName: 'Unknown Org', idempotencyKey: 'manual-1' }), /explicitly/);
  const manual = engine.reviewEmailCandidate('email_user', candidate.id, { kind: 'create-manual', title: 'Unknown Call', organizationName: 'Unknown Org', status: 'accepted', idempotencyKey: 'manual-2' }); assert.equal(manual.mutation.trackerUpdated, true); assert.equal(engine.store.manualTrackerEntries[0]?.sourceKind, 'email'); assert.equal(engine.store.manualTrackerEntries[0]?.myStatus, 'accepted');
});
