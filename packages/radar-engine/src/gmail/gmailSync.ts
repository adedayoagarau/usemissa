import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { Clock, IdGenerator } from '../ports.js';
import type { EmailReviewCandidate, GmailConnection, GmailMode, GmailOAuthState, GmailSyncJob, GmailSyncTrigger, InboundEmailEnvelope } from '../domain/types.js';
import type { RadarStore } from '../store/store.js';
import { ingestInboundEmail, type IngestResult } from '../email/emailForwarding.js';

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
export const GMAIL_DEFAULT_WINDOW_DAYS = 30 as const;
const OAUTH_STATE_TTL_MS = 10 * 60_000;
const TOKEN_VERSION = Number(process.env.MISSA_GMAIL_TOKEN_KEY_VERSION || '1') || 1;

export interface GmailOAuthConfig { clientId: string; redirectUri: string; authorizationEndpoint?: string; }
export interface GmailTokenExchange { googleSubjectId: string; accountEmail: string; refreshToken: string; grantedScopes: string[]; }
export interface GmailProviderPort {
  buildAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string; codeChallenge: string }): string;
  exchangeCode(input: { code: string; redirectUri: string; codeVerifier: string }): Promise<GmailTokenExchange>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }>;
  revokeToken(refreshToken: string): Promise<void>;
  watchMailbox(accessToken: string): Promise<{ historyId: string; expiration: string }>;
  stopWatch(accessToken: string): Promise<void>;
  listMessages(accessToken: string, query: { after: string; labelIds?: string[]; senderDomain?: string; max: number }): Promise<Array<{ id: string; threadId?: string; historyId?: string }> >;
  getMessageMetadata(accessToken: string, messageId: string): Promise<{ from?: string; subject: string; receivedAt: string }>;
  getMessageText(accessToken: string, messageId: string): Promise<InboundEmailEnvelope>;
  listHistory(accessToken: string, historyId: string): Promise<{ historyId: string; messageIds: string[] }>;
}

function keyMaterial(): Buffer {
  const configured = process.env.MISSA_GMAIL_TOKEN_KEY;
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('MISSA_GMAIL_TOKEN_KEY is required in production.');
  return createHash('sha256').update(configured || 'local-gmail-token-key-change-me').digest();
}
function keyVersion(): number { return TOKEN_VERSION; }
function keyForVersion(version: number): Buffer | undefined {
  if (version === keyVersion()) return keyMaterial();
  const previous = process.env.MISSA_GMAIL_TOKEN_KEY_PREVIOUS;
  if (!previous || version !== keyVersion() - 1) return undefined;
  return createHash('sha256').update(previous).digest();
}
export interface DecryptedGmailToken { token: string; keyVersion: number; }
export function encryptGmailRefreshToken(token: string): { encrypted: string; keyVersion: number } {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', keyMaterial(), iv); const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return { encrypted: `v${keyVersion()}.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`, keyVersion: keyVersion() };
}
export function decryptGmailRefreshToken(value: string): DecryptedGmailToken {
  const [versionRaw, ivRaw, tagRaw, bodyRaw] = value.split('.'); const version = Number((versionRaw || '').replace(/^v/, '')); const key = keyForVersion(version);
  if (!key || !ivRaw || !tagRaw || !bodyRaw) throw new Error('Gmail token could not be decrypted.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url')); decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return { token: Buffer.concat([decipher.update(Buffer.from(bodyRaw, 'base64url')), decipher.final()]).toString('utf8'), keyVersion: version };
}

function stateHash(value: string): string { return createHmac('sha256', process.env.MISSA_SESSION_SECRET || 'local-session-secret').update(value).digest('hex'); }
function nonceHash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
function codeChallenge(verifier: string): string { return createHash('sha256').update(verifier).digest('base64url'); }
function maskedEmail(email: string): string { const [local, domain] = email.trim().toLowerCase().split('@'); if (!local || !domain) return 'Connected Gmail account'; return `${local.slice(0, 1)}${'•'.repeat(Math.min(5, Math.max(2, local.length - 1)))}@${domain}`; }
export function gmailAccountLookupKey(email: string): string { return createHmac('sha256', keyMaterial()).update(email.trim().toLowerCase()).digest('hex'); }
function exactConfig(config?: Partial<GmailOAuthConfig>): GmailOAuthConfig {
  const clientId = config?.clientId || process.env.GOOGLE_CLIENT_ID; const redirectUri = config?.redirectUri || process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri || (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_CLIENT_SECRET)) throw new Error('Gmail OAuth is not configured.');
  try { const parsed = new URL(redirectUri); if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('Invalid redirect URI.'); } catch { throw new Error('Invalid redirect URI.'); }
  return { clientId, redirectUri, authorizationEndpoint: config?.authorizationEndpoint || 'https://accounts.google.com/o/oauth2/v2/auth' };
}
export function createGmailOAuthState(store: RadarStore, userId: string, config?: Partial<GmailOAuthConfig>, now = new Date(), ids?: IdGenerator): { state: string; nonce: string; codeVerifier: string; authorizationUrl: string } {
  const resolved = exactConfig(config); const state = randomBytes(32).toString('base64url'); const nonce = randomBytes(24).toString('base64url'); const codeVerifier = randomBytes(48).toString('base64url');
  const stateRecord: GmailOAuthState = { id: ids?.next('gmail_oauth') ?? randomUUID(), stateHash: stateHash(state), userId, redirectUri: resolved.redirectUri, encryptedPkceVerifier: encryptGmailRefreshToken(codeVerifier).encrypted, nonceHash: nonceHash(nonce), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + OAUTH_STATE_TTL_MS).toISOString() };
  store.gmailOAuthStates.push(stateRecord);
  const endpoint = resolved.authorizationEndpoint!; const params = new URLSearchParams({ client_id: resolved.clientId, redirect_uri: resolved.redirectUri, response_type: 'code', scope: GMAIL_READONLY_SCOPE, access_type: 'offline', prompt: 'consent', state, nonce, code_challenge: codeChallenge(codeVerifier), code_challenge_method: 'S256' });
  return { state, nonce, codeVerifier, authorizationUrl: `${endpoint}?${params.toString()}` };
}
export function consumeGmailOAuthState(store: RadarStore, state: string, userId: string, redirectUri: string, now = new Date(), nonce?: string): { userId: string; codeVerifier: string; redirectUri: string } {
  const record = store.gmailOAuthStates.find((item) => item.stateHash === stateHash(state));
  if (!record || record.userId !== userId || record.redirectUri !== redirectUri || record.consumedAt || Date.parse(record.expiresAt) <= now.getTime() || (nonce !== undefined && record.nonceHash !== nonceHash(nonce))) throw new Error('Gmail authorization expired. Please reconnect.');
  record.consumedAt = now.toISOString(); return { userId: record.userId, codeVerifier: decryptGmailRefreshToken(record.encryptedPkceVerifier).token, redirectUri: record.redirectUri };
}

export function createGmailConnection(store: RadarStore, userId: string, exchange: GmailTokenExchange, now = new Date(), ids?: IdGenerator): GmailConnection {
  if (!exchange.googleSubjectId || !exchange.refreshToken || !exchange.grantedScopes.includes(GMAIL_READONLY_SCOPE)) throw new Error('Gmail did not grant the required read access.');
  const existing = store.gmailConnections.find((connection) => connection.googleSubjectId === exchange.googleSubjectId);
  if (existing && existing.userId !== userId && existing.status !== 'disconnected') throw new Error('This Google account is already connected to another Missa account.');
  const encrypted = encryptGmailRefreshToken(exchange.refreshToken); const connection: GmailConnection = { id: existing?.id ?? ids?.next('gmail_connection') ?? randomUUID(), userId, googleSubjectId: exchange.googleSubjectId, googleAccountHash: gmailAccountLookupKey(exchange.accountEmail), accountEmailMasked: maskedEmail(exchange.accountEmail), encryptedRefreshToken: encrypted.encrypted, tokenKeyVersion: encrypted.keyVersion, grantedScopes: [GMAIL_READONLY_SCOPE], mode: 'review', status: 'active', scanWindowDays: 30, consentedAt: now.toISOString() };
  if (existing) Object.assign(existing, connection); else store.gmailConnections.push(connection); return connection;
}
export function queueGmailSyncJob(store: RadarStore, connection: GmailConnection, trigger: GmailSyncTrigger, dedupeKey: string, now = new Date(), ids?: IdGenerator): GmailSyncJob {
  const existing = store.gmailSyncJobs.find((job) => job.connectionId === connection.id && job.dedupeKey === dedupeKey && job.status !== 'cancelled'); if (existing) return existing;
  const job: GmailSyncJob = { id: ids?.next('gmail_job') ?? randomUUID(), connectionId: connection.id, userId: connection.userId, trigger, status: 'queued', requestedAt: now.toISOString(), attemptCount: 0, dedupeKey }; store.gmailSyncJobs.push(job); return job;
}
export function leaseGmailSyncJob(store: RadarStore, jobId: string, now = new Date(), leaseMs = 5 * 60_000): GmailSyncJob {
  const job = store.gmailSyncJobs.find((item) => item.id === jobId); if (!job) throw new Error('Gmail sync job not found.');
  const busy = store.gmailSyncJobs.find((item) => item.connectionId === job.connectionId && item.status === 'running' && item.leaseUntil && Date.parse(item.leaseUntil) > now.getTime() && item.id !== job.id); if (busy) throw new Error('Gmail sync is already running.');
  if (!['queued', 'failed'].includes(job.status) || (job.nextAttemptAt && Date.parse(job.nextAttemptAt) > now.getTime())) throw new Error('Gmail sync job is not ready.');
  job.status = 'running'; job.attemptCount += 1; job.leaseUntil = new Date(now.getTime() + leaseMs).toISOString(); return job;
}
export function completeGmailSyncJob(store: RadarStore, jobId: string, result: GmailSyncJob['result'], targetHistoryId?: string, now = new Date()): GmailSyncJob {
  const job = store.gmailSyncJobs.find((item) => item.id === jobId); if (!job || job.status !== 'running') throw new Error('Gmail sync job is not running.'); job.status = 'succeeded'; job.result = result; job.targetHistoryId = targetHistoryId; job.completedAt = now.toISOString(); job.leaseUntil = undefined; const connection = store.gmailConnections.find((item) => item.id === job.connectionId); if (connection) { connection.status = 'active'; connection.lastSyncAt = now.toISOString(); connection.historyId = targetHistoryId ?? connection.historyId; connection.nextSyncAt = new Date(now.getTime() + 15 * 60_000).toISOString(); } return job;
}
export function failGmailSyncJob(store: RadarStore, jobId: string, errorCode: string, now = new Date()): GmailSyncJob {
  const job = store.gmailSyncJobs.find((item) => item.id === jobId); if (!job || job.status !== 'running') throw new Error('Gmail sync job is not running.'); job.status = 'failed'; job.errorCode = errorCode.slice(0, 80); job.leaseUntil = undefined; job.nextAttemptAt = new Date(now.getTime() + Math.min(60 * 60_000, 1_000 * (2 ** Math.min(job.attemptCount, 8)))).toISOString(); const connection = store.gmailConnections.find((item) => item.id === job.connectionId); if (connection) { connection.status = 'error'; connection.lastErrorCode = job.errorCode; } return job;
}
export function cleanupGmailOAuthStates(store: RadarStore, now = new Date()): number { const before = store.gmailOAuthStates.length; store.gmailOAuthStates = store.gmailOAuthStates.filter((state) => !state.consumedAt && Date.parse(state.expiresAt) > now.getTime()); return before - store.gmailOAuthStates.length; }
export function setGmailMode(store: RadarStore, userId: string, mode: GmailMode, confirmation: boolean, idempotencyKey: string): GmailConnection {
  const connection = store.gmailConnections.find((item) => item.userId === userId && item.status !== 'disconnected'); if (!connection) throw new Error('Gmail is not connected.');
  if (connection.lastModeMutationKey === idempotencyKey) return connection;
  if (mode === 'autopilot' && !confirmation) throw new Error('Autopilot requires explicit confirmation.');
  connection.mode = mode; connection.lastModeMutationKey = idempotencyKey; return connection;
}
export function disconnectGmail(store: RadarStore, userId: string, deletePending = false, now = new Date()): { deletedCandidates: number; cancelledJobs: number } {
  const connection = store.gmailConnections.find((item) => item.userId === userId && item.status !== 'disconnected'); if (!connection) throw new Error('Gmail is not connected.');
  connection.status = 'disconnected'; connection.disconnectedAt = now.toISOString(); connection.encryptedRefreshToken = ''; connection.googleSubjectId = `disconnected:${connection.id}`;
  const beforeJobs = store.gmailSyncJobs.length; store.gmailSyncJobs = store.gmailSyncJobs.filter((job) => { if (job.connectionId !== connection.id || ['succeeded', 'failed', 'cancelled'].includes(job.status)) return true; job.status = 'cancelled'; return false; });
  let deletedCandidates = 0; if (deletePending) { const before = store.emailCandidates.length; store.emailCandidates = store.emailCandidates.filter((candidate) => !(candidate.gmailConnectionId === connection.id && (candidate.state === 'pending' || candidate.state === 'duplicate'))); deletedCandidates = before - store.emailCandidates.length; }
  return { deletedCandidates, cancelledJobs: beforeJobs - store.gmailSyncJobs.length };
}

export interface AutopilotGate { allowed: boolean; reason: string; }
export function gmailAutopilotGate(store: RadarStore, connection: GmailConnection, candidate: EmailReviewCandidate): AutopilotGate {
  if (connection.mode !== 'autopilot') return { allowed: false, reason: 'Autopilot is disabled.' };
  if (candidate.state !== 'pending') return { allowed: false, reason: 'Candidate is no longer pending.' };
  if (candidate.classification !== 'matched' || candidate.candidates.length !== 1 || candidate.confidence !== 'high') return { allowed: false, reason: 'The match is not exact and high confidence.' };
  if (!candidate.proposedStatus || !['received', 'in-review'].includes(candidate.proposedStatus)) return { allowed: false, reason: 'Only received or in-review updates can be automated.' };
  if (candidate.warnings.length > 0) return { allowed: false, reason: 'This email has a warning that needs review.' };
  const tracked = store.tracked.find((row) => row.userId === connection.userId && row.opportunityId === candidate.candidates[0]!.opportunityId); if (!tracked) return { allowed: false, reason: 'The opportunity is not tracked by this account.' };
  if (['accepted', 'declined', 'waitlisted', 'finalist', 'shortlisted', 'withdrawn', 'revision-requested'].includes(tracked.myStatus)) return { allowed: false, reason: 'A newer terminal status needs review.' };
  return { allowed: true, reason: 'Exact tracked opportunity and high-confidence non-sensitive status.' };
}

export function ingestGmailEnvelope(store: RadarStore, connection: GmailConnection, envelope: InboundEmailEnvelope, now = new Date(), ids?: IdGenerator): IngestResult {
  const result = ingestInboundEmail(store, envelope, now, ids, { gmailConnectionId: connection.id });
  if (result.candidateId) { const candidate = store.emailCandidates.find((item) => item.id === result.candidateId); if (candidate) { candidate.sourceMode = connection.mode === 'autopilot' ? 'autopilot' : 'gmail-sync'; candidate.gmailConnectionId = connection.id; candidate.gmailMessageId = envelope.providerMessageId; candidate.gmailThreadId = envelope.headers['x-gmail-thread-id']; candidate.gmailHistoryId = envelope.headers['x-gmail-history-id']; candidate.forwardingAddressId = undefined; } }
  return result;
}
