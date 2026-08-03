import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Clock, IdGenerator } from '../ports.js';
import type { EmailConfidence, EmailReviewCandidate, ForwardingAddress, InboundEmailEnvelope, ManualTrackerEntry, MyStatus, StatusEvent, TrackedOpportunity } from '../domain/types.js';
import type { RadarStore } from '../store/store.js';
import { normalizeName, titleSimilarity } from '../dedup/dedup.js';

export const EMAIL_CANDIDATE_RETENTION_DAYS = 30;
export const EMAIL_MAX_BODY_CHARS = 100_000;
export const EMAIL_MAX_ENVELOPE_BYTES = 10 * 1024 * 1024;
const DAY = 86_400_000;

export type EmailReviewDecision =
  | { kind: 'confirm'; opportunityId: string; status?: MyStatus; work?: string; idempotencyKey: string }
  | { kind: 'create-manual'; title: string; organizationName: string; status?: MyStatus; work?: string; idempotencyKey: string }
  | { kind: 'ignore'; idempotencyKey: string }
  | { kind: 'delete'; idempotencyKey: string };

export class EmailForwardingError extends Error {
  constructor(readonly code: 'invalid' | 'conflict' | 'not-found' | 'forbidden' | 'expired' | 'rate-limit', message: string) { super(message); }
}

function forwardingSecret(): string {
  const configured = process.env.MISSA_FORWARDING_SECRET;
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('MISSA_FORWARDING_SECRET is required in production.');
  return configured || 'local-forwarding-secret-change-me';
}
function forwardingDomain(): string { return process.env.MISSA_FORWARDING_DOMAIN || 'track.usemissa.com'; }
function keyBytes(): Buffer { return createHash('sha256').update(forwardingSecret()).digest(); }
function hashToken(token: string): string { return createHmac('sha256', forwardingSecret()).update(token).digest('hex'); }
function encryptToken(token: string): string {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
  const value = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${value.toString('base64url')}`;
}
function decryptToken(value: string): string | undefined {
  try {
    const [ivRaw, tagRaw, bodyRaw] = value.split('.');
    if (!ivRaw || !tagRaw || !bodyRaw) return undefined;
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(bodyRaw, 'base64url')), decipher.final()]).toString('utf8');
  } catch { return undefined; }
}
function opaqueToken(): string { return randomBytes(32).toString('hex'); }
function fullAddress(record: ForwardingAddress): string | undefined {
  const token = decryptToken(record.tokenCiphertext); return token ? `${token}@${record.domain}` : undefined;
}
function tokenFromAddress(value: string, domain: string): string | undefined {
  const trimmed = value.trim(); const suffix = `@${domain.toLowerCase()}`;
  if (!trimmed.toLowerCase().endsWith(suffix)) return undefined;
  const local = trimmed.slice(0, -suffix.length);
  return /^[a-z0-9]{20,64}$/i.test(local) ? local : undefined;
}
function iso(now: Date): string { return now.toISOString(); }

export interface ForwardingAddressView {
  configured: boolean;
  address?: string;
  addressId?: string;
  status?: ForwardingAddress['status'];
  createdAt?: string;
  rotatedAt?: string;
  revokedAt?: string;
  lastReceivedAt?: string;
  acceptedCount?: number;
  retentionDays: number;
}

export function forwardingAddressView(store: RadarStore, userId: string): ForwardingAddressView {
  const record = store.forwardingAddresses.find((item) => item.userId === userId && item.status !== 'revoked');
  if (!record) return { configured: false, retentionDays: EMAIL_CANDIDATE_RETENTION_DAYS };
  return { configured: true, address: fullAddress(record), addressId: record.id, status: record.status, createdAt: record.createdAt, ...(record.rotatedAt ? { rotatedAt: record.rotatedAt } : {}), ...(record.revokedAt ? { revokedAt: record.revokedAt } : {}), ...(record.lastReceivedAt ? { lastReceivedAt: record.lastReceivedAt } : {}), acceptedCount: record.acceptedCount, retentionDays: EMAIL_CANDIDATE_RETENTION_DAYS };
}

export function createOrGetForwardingAddress(store: RadarStore, userId: string, now = new Date(), ids?: IdGenerator): { record: ForwardingAddress; address: string; created: boolean } {
  const current = store.forwardingAddresses.find((item) => item.userId === userId && item.status !== 'revoked');
  if (current) return { record: current, address: fullAddress(current) ?? '', created: false };
  const token = opaqueToken();
  const record: ForwardingAddress = { id: ids?.next('forwarding') ?? `forwarding_${randomBytes(8).toString('hex')}`, userId, tokenHash: hashToken(token), tokenCiphertext: encryptToken(token), tokenVersion: 1, domain: forwardingDomain(), status: 'active', createdAt: iso(now), acceptedCount: 0 };
  store.forwardingAddresses.push(record);
  return { record, address: `${token}@${record.domain}`, created: true };
}

function ownerAddress(store: RadarStore, userId: string): ForwardingAddress {
  const record = store.forwardingAddresses.find((item) => item.userId === userId && item.status !== 'revoked');
  if (!record) throw new EmailForwardingError('not-found', 'Forwarding address is not configured.');
  return record;
}

export function rotateForwardingAddress(store: RadarStore, userId: string, now = new Date(), ids?: IdGenerator, idempotencyKey?: string): { record: ForwardingAddress; address: string } {
  const active = store.forwardingAddresses.find((item) => item.userId === userId && item.status === 'active');
  if (active && idempotencyKey && active.lastMutationKey === idempotencyKey) return { record: active, address: fullAddress(active) ?? '' };
  const old = ownerAddress(store, userId); old.status = 'revoked'; old.revokedAt = iso(now); old.rotatedAt = iso(now);
  const token = opaqueToken();
  const record: ForwardingAddress = { id: ids?.next('forwarding') ?? `forwarding_${randomBytes(8).toString('hex')}`, userId, tokenHash: hashToken(token), tokenCiphertext: encryptToken(token), tokenVersion: old.tokenVersion + 1, domain: old.domain, status: 'active', createdAt: iso(now), rotatedAt: iso(now), acceptedCount: 0, ...(idempotencyKey ? { lastMutationKey: idempotencyKey } : {}) };
  store.forwardingAddresses.push(record); return { record, address: `${token}@${record.domain}` };
}
export function setForwardingAddressStatus(store: RadarStore, userId: string, status: 'active' | 'paused'): ForwardingAddress {
  const record = ownerAddress(store, userId); record.status = status; return record;
}
export function revokeForwardingAddress(store: RadarStore, userId: string, now = new Date(), deletePending = false): { deletedCandidates: number } {
  const record = ownerAddress(store, userId); record.status = 'revoked'; record.revokedAt = iso(now);
  let deletedCandidates = 0;
  if (deletePending) { const before = store.emailCandidates.length; store.emailCandidates = store.emailCandidates.filter((candidate) => !(candidate.forwardingAddressId === record.id && (candidate.state === 'pending' || candidate.state === 'expired'))); deletedCandidates = before - store.emailCandidates.length; }
  return { deletedCandidates };
}

function stripControls(value: string): string { return value.replace(/\u0000/g, '').replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ''); }
function htmlToText(value: string): string {
  return stripControls(value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>'));
}
function cleanBody(raw: string): { text: string; warnings: string[] } {
  const warnings: string[] = [];
  if (raw.includes('\u0000')) warnings.push('unsupported-content');
  let text = stripControls(raw).replace(/\r\n?/g, '\n');
  text = text.split(/^\s*(?:On .+ wrote:|Begin forwarded message:|-----Original Message-----)\s*$/im)[0] ?? text;
  text = text.split(/^\s*--\s*$/m)[0] ?? text;
  text = text.trim().slice(0, EMAIL_MAX_BODY_CHARS);
  if (!text.trim()) warnings.push('unsupported-content');
  return { text, warnings };
}
function senderParts(address?: string): { address?: string; domain?: string } {
  if (!address) return {};
  const match = /<?([^<>\s@]+@[^<>\s@]+)>?/.exec(address.trim().toLowerCase());
  if (!match) return { address: address.trim().toLowerCase() };
  return { address: match[1], domain: match[1]!.split('@')[1] };
}
function safeFilename(value: string): string { return value.replace(/[/\\]/g, '_').replace(/\.\.+/g, '.').replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 180) || 'attachment'; }
function unsafeAttachment(type: string, filename: string): boolean { return /(?:exe|dll|cmd|bat|js|vbs|sh|msi|zip|rar|7z|tar|gz|html|svg|jar)/i.test(`${type} ${filename}`); }
function parseDate(text: string): string | undefined {
  const match = /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/.exec(text); if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]) ? date.toISOString().slice(0, 10) : undefined;
}
function extractStatus(text: string): { status?: MyStatus; confidence: EmailConfidence; reason?: string; sensitive: boolean } {
  const checks: Array<[RegExp, MyStatus, EmailConfidence, string, boolean]> = [
    [/revise and resubmit/i, 'revision-requested', 'high', 'The message says revise and resubmit.', true],
    [/\b(shortlisted|short list)\b/i, 'shortlisted', 'high', 'The message mentions a shortlist.', true],
    [/\b(longlisted|long list)\b/i, 'longlisted', 'high', 'The message mentions a longlist.', true],
    [/\b(finalist)\b/i, 'finalist', 'possible', 'The message mentions finalist status.', true],
    [/\b(congratulations|selected)\b/i, 'accepted', 'possible', 'The message contains a selection signal.', true],
    [/\b(we regret|not selected|declined)\b/i, 'declined', 'possible', 'The message contains a decline signal.', true],
    [/\b(now under review|currently reviewing|in review)\b/i, 'in-review', 'high', 'The message says the submission is under review.', false],
    [/(thank you for your submission|submission received|we received)/i, 'received', 'high', 'The message confirms receipt.', false],
  ];
  for (const [pattern, status, confidence, reason, sensitive] of checks) if (pattern.test(text)) return { status, confidence, reason, sensitive };
  return { confidence: 'unknown', sensitive: false };
}

function trackedForUser(store: RadarStore, userId: string): TrackedOpportunity[] { return store.tracked.filter((row) => row.userId === userId); }
function candidateHash(envelope: InboundEmailEnvelope, body: string): string { return createHash('sha256').update(`${envelope.provider}|${envelope.providerMessageId ?? envelope.messageIdHeader ?? ''}|${body}`).digest('hex'); }
function normalizedSubject(value: string): string { return normalizeName(value.replace(/^(re|fwd?):\s*/i, '')); }

export interface IngestResult { accepted: boolean; candidateId?: string; reason?: 'unavailable' | 'duplicate' | 'rate-limit'; }

export function ingestInboundEmail(store: RadarStore, envelope: InboundEmailEnvelope, now = new Date(), ids?: IdGenerator, options?: { gmailConnectionId?: string }): IngestResult {
  const gmailConnection = options?.gmailConnectionId ? store.gmailConnections.find((item) => item.id === options.gmailConnectionId && item.status === 'active') : undefined;
  const recipient = envelope.to.map((value) => tokenFromAddress(value, forwardingDomain())).find(Boolean);
  const address = recipient ? store.forwardingAddresses.find((item) => item.tokenHash === hashToken(recipient)) : undefined;
  if (!gmailConnection && (!address || address.status !== 'active')) return { accepted: false, reason: 'unavailable' };
  const ownerId = gmailConnection?.userId ?? address!.userId;
  const forwardingAddressId = address?.id;
  const messageKey = envelope.providerMessageId || envelope.messageIdHeader || candidateHash(envelope, envelope.textBody || envelope.htmlBody || '');
  const existing = store.emailCandidates.find((candidate) => (gmailConnection ? candidate.gmailConnectionId === gmailConnection.id : candidate.forwardingAddressId === forwardingAddressId) && candidate.provider === envelope.provider && candidate.providerMessageId === messageKey);
  if (existing) return { accepted: true, candidateId: existing.id, reason: 'duplicate' };
  const recent = store.emailCandidates.filter((candidate) => (gmailConnection ? candidate.gmailConnectionId === gmailConnection.id : candidate.forwardingAddressId === forwardingAddressId) && now.getTime() - Date.parse(candidate.createdAt) < DAY);
  if (recent.filter((candidate) => now.getTime() - Date.parse(candidate.createdAt) < 3_600_000).length >= 30 || recent.length >= 100) return { accepted: false, reason: 'rate-limit' };
  const raw = envelope.textBody?.trim() || (envelope.htmlBody ? htmlToText(envelope.htmlBody) : '');
  const body = cleanBody(raw); const sender = senderParts(envelope.from); const status = extractStatus(body.text);
  if (sender.domain && recent.filter((candidate) => candidate.senderDomain === sender.domain && now.getTime() - Date.parse(candidate.createdAt) < 3_600_000).length >= 10) return { accepted: false, reason: 'rate-limit' };
  const bodyHash = createHash('sha256').update(body.text).digest('hex');
  const nearDuplicate = store.emailCandidates.find((candidate) => (gmailConnection ? candidate.gmailConnectionId === gmailConnection.id : candidate.forwardingAddressId === forwardingAddressId) && candidate.senderDomain === sender.domain && normalizedSubject(candidate.subject) === normalizedSubject(envelope.subject) && candidate.bodyHash === bodyHash && now.getTime() - Date.parse(candidate.createdAt) < DAY);
  const tracked = trackedForUser(store, ownerId);
  const candidates = tracked.map((row) => {
    const opportunity = store.opportunities.get(row.opportunityId); if (!opportunity) return undefined;
    let score = titleSimilarity(envelope.subject, opportunity.fields.title);
    const reasons: string[] = [];
    const org = opportunity.fields.organizationName?.toLowerCase();
    if (sender.domain && opportunity.sourceUrl) { try { if (new URL(opportunity.sourceUrl).hostname.toLowerCase().endsWith(sender.domain)) { score += 0.5; reasons.push('Sender domain matches the opportunity source.'); } } catch { reasons.push('The opportunity source URL could not be checked.'); } }
    if (org && normalizeName(envelope.subject).includes(normalizeName(org))) { score += 0.2; reasons.push('Subject names the organization.'); }
    if (score < 0.45) return undefined;
    return { opportunityId: opportunity.id, title: opportunity.fields.title, ...(opportunity.fields.organizationName ? { organizationName: opportunity.fields.organizationName } : {}), confidence: score >= 0.8 ? 'high' as const : 'possible' as const, reasons: reasons.length ? reasons : ['Subject resembles a tracked opportunity.'], score };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => b.score - a.score);
  const warnings = [...body.warnings];
  if (sender.domain && /^(gmail|yahoo|outlook|hotmail)\./i.test(sender.domain)) warnings.push('free-mail-sender');
  if (envelope.authResults && Object.values(envelope.authResults).some((value) => value === 'fail')) warnings.push('authentication-failed');
  if (sender.address && !sender.domain) warnings.push('malformed-sender');
  const attachmentMetadata = envelope.attachments.map((item) => ({ filename: safeFilename(item.filename), contentType: item.contentType || 'application/octet-stream', byteLength: Math.max(0, Math.min(item.byteLength, 50 * 1024 * 1024)), ...(item.sha256 ? { sha256: item.sha256 } : {}), unsafe: unsafeAttachment(item.contentType, item.filename) }));
  if (attachmentMetadata.some((item) => item.unsafe)) warnings.push('unsafe-attachment');
  const classification = nearDuplicate ? 'duplicate' : body.warnings.includes('unsupported-content') ? 'unsupported-content' : candidates.length > 1 && candidates[0]!.score - candidates[1]!.score < 0.15 ? 'ambiguous' : candidates.length ? 'matched' : 'unmatched';
  const candidate: EmailReviewCandidate = { id: ids?.next('email_candidate') ?? `email_candidate_${randomBytes(8).toString('hex')}`, userId: ownerId, ...(forwardingAddressId ? { forwardingAddressId } : {}), ...(gmailConnection ? {} : { sourceMode: 'forwarding' as const }), provider: envelope.provider, providerMessageId: messageKey, receivedAt: envelope.receivedAt, ...(sender.address ? { senderAddress: sender.address } : {}), ...(sender.domain ? { senderDomain: sender.domain } : {}), subject: envelope.subject.trim().slice(0, 300), bodyExcerpt: body.text.slice(0, 2_000), bodyHash, attachmentMetadata, classification, state: nearDuplicate ? 'duplicate' : 'pending', ...(candidates[0] ? { matchedOpportunityId: candidates[0].opportunityId } : {}), candidates: candidates.map(({ score: _score, ...item }) => item), ...(status.status ? { proposedStatus: status.status } : {}), ...(parseDate(body.text) ? { proposedDeadline: parseDate(body.text) } : {}), confidence: status.confidence === 'high' && candidates.length ? 'high' : status.confidence === 'unknown' && !candidates.length ? 'unknown' : 'possible', warnings, evidenceReasons: [status.reason, ...(candidates[0]?.reasons ?? []), ...(nearDuplicate ? ['A similar forwarded message was already received recently.'] : [])].filter((item): item is string => Boolean(item)), createdAt: iso(now), expiresAt: new Date(now.getTime() + EMAIL_CANDIDATE_RETENTION_DAYS * DAY).toISOString() };
  store.emailCandidates.push(candidate); if (address) { address.lastReceivedAt = iso(now); address.acceptedCount += 1; }
  return { accepted: true, candidateId: candidate.id };
}

export function listEmailCandidates(store: RadarStore, userId: string, state: 'pending' | 'all' = 'pending', classification?: string): EmailReviewCandidate[] {
  const now = Date.now(); return store.emailCandidates.filter((candidate) => candidate.userId === userId && Date.parse(candidate.expiresAt) > now && (state === 'all' || candidate.state === 'pending' || candidate.state === 'duplicate') && (!classification || candidate.classification === classification)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function cleanupEmailCandidates(store: RadarStore, now = new Date()): number { const before = store.emailCandidates.length; store.emailCandidates = store.emailCandidates.filter((candidate) => Date.parse(candidate.expiresAt) > now.getTime()); return before - store.emailCandidates.length; }

const SENSITIVE: ReadonlySet<MyStatus> = new Set(['accepted', 'declined', 'waitlisted', 'finalist', 'shortlisted', 'withdrawn']);
export interface EmailReviewMutation { trackerUpdated: boolean; manualEntryId?: string; statusEventId?: string }

export function reviewEmailCandidate(store: RadarStore, userId: string, candidateId: string, decision: EmailReviewDecision, now = new Date(), ids?: IdGenerator): { candidate: EmailReviewCandidate; mutation: EmailReviewMutation } {
  const candidate = store.emailCandidates.find((item) => item.id === candidateId && item.userId === userId);
  if (!candidate) throw new EmailForwardingError('not-found', 'Email update not found.');
  if (candidate.reviewIdempotencyKey === decision.idempotencyKey && candidate.reviewResult) return { candidate, mutation: candidate.reviewResult };
  if (candidate.state === 'deleted') throw new EmailForwardingError('conflict', 'This email has been deleted.');
  if (Date.parse(candidate.expiresAt) <= now.getTime()) { candidate.state = 'expired'; throw new EmailForwardingError('expired', 'This email is no longer available for review.'); }
  if (decision.kind === 'ignore') { candidate.state = 'ignored'; candidate.reviewedAt = iso(now); candidate.reviewIdempotencyKey = decision.idempotencyKey; candidate.reviewResult = { trackerUpdated: false }; return { candidate, mutation: candidate.reviewResult }; }
  if (decision.kind === 'delete') { candidate.state = 'deleted'; candidate.bodyExcerpt = ''; candidate.senderAddress = undefined; candidate.senderDomain = undefined; candidate.attachmentMetadata = []; candidate.reviewedAt = iso(now); candidate.reviewIdempotencyKey = decision.idempotencyKey; candidate.reviewResult = { trackerUpdated: false }; return { candidate, mutation: candidate.reviewResult }; }
  const status = decision.status ?? candidate.proposedStatus;
  if (!status) throw new EmailForwardingError('invalid', 'Choose a status before confirming this update.');
  if (SENSITIVE.has(status) && !decision.status) throw new EmailForwardingError('invalid', 'Choose the status explicitly before confirming this sensitive update.');
  if (decision.kind === 'confirm') {
    const tracked = store.tracked.find((row) => row.userId === userId && row.opportunityId === decision.opportunityId);
    if (!tracked) throw new EmailForwardingError('forbidden', 'Track this opportunity before confirming an email update.');
    const sourceLabel = candidate.sourceMode === 'gmail-sync' || candidate.sourceMode === 'autopilot' ? 'Gmail Sync' : 'a forwarded email';
    const event: StatusEvent = { at: iso(now), from: tracked.myStatus, to: status, source: 'email', confidence: candidate.confidence, candidateId: candidate.id, note: `Confirmed from ${sourceLabel}.` };
    tracked.myStatus = status; if (candidate.proposedSubmittedAt) tracked.submittedAt = candidate.proposedSubmittedAt; tracked.events.push(event);
    candidate.state = 'confirmed'; candidate.reviewedAt = iso(now); candidate.reviewIdempotencyKey = decision.idempotencyKey; candidate.reviewResult = { trackerUpdated: true, statusEventId: ids?.next('status_event') ?? `status_event_${randomBytes(6).toString('hex')}` }; return { candidate, mutation: candidate.reviewResult };
  }
  const title = decision.title.trim(); const organizationName = decision.organizationName.trim();
  if (!title || !organizationName || title.length > 240 || organizationName.length > 240) throw new EmailForwardingError('invalid', 'Title and organization are required.');
  const sourceLabel = candidate.sourceMode === 'gmail-sync' || candidate.sourceMode === 'autopilot' ? 'Gmail Sync' : 'a forwarded email';
  const manual: ManualTrackerEntry = { id: ids?.next('manual_email') ?? `manual_email_${randomBytes(8).toString('hex')}`, userId, title, organizationName, ...(decision.work ? { work: decision.work.trim().slice(0, 240) } : {}), myStatus: status, ...(candidate.proposedDeadline ? { deadline: candidate.proposedDeadline } : {}), ...(candidate.proposedSubmittedAt ? { submittedAt: candidate.proposedSubmittedAt } : {}), notes: `Created from ${sourceLabel}.`, sourceKind: 'email', sourceRow: 0, importedAt: iso(now), importHash: `email:${candidate.id}` };
  store.manualTrackerEntries.push(manual);
  const event: StatusEvent = { at: iso(now), to: status, source: 'email', confidence: candidate.confidence, candidateId: candidate.id, note: `Confirmed from ${sourceLabel}.` };
  manual.events = [event];
  candidate.state = 'confirmed'; candidate.reviewedAt = iso(now); candidate.reviewIdempotencyKey = decision.idempotencyKey; candidate.reviewResult = { trackerUpdated: true, manualEntryId: manual.id, statusEventId: ids?.next('status_event') ?? `status_event_${randomBytes(6).toString('hex')}` };
  return { candidate, mutation: candidate.reviewResult };
}

export function verifyForwardingToken(token: string, expectedHash: string): boolean { const actual = Buffer.from(hashToken(token), 'hex'); const expected = Buffer.from(expectedHash, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); }
