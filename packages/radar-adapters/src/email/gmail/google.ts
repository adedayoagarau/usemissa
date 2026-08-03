import type { GmailProviderPort, GmailTokenExchange, InboundEmailEnvelope } from '@missa/radar-engine';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const TOKENINFO_ENDPOINT = 'https://oauth2.googleapis.com/tokeninfo';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';
const MAX_BODY_BYTES = 1_000_000;
const MAX_HEADER_LENGTH = 2_000;

type JsonRecord = Record<string, unknown>;

export interface GoogleGmailProviderOptions {
  fetch?: typeof fetch;
  tokenEndpoint?: string;
  revokeEndpoint?: string;
  userInfoEndpoint?: string;
  tokenInfoEndpoint?: string;
  gmailApiBase?: string;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function safeText(value: unknown, max = MAX_HEADER_LENGTH): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '';
}

function headerValue(headers: Array<{ name?: unknown; value?: unknown }>, name: string): string | undefined {
  const target = name.toLowerCase();
  const found = headers.find((header) => safeText(header.name).toLowerCase() === target);
  const value = safeText(found?.value);
  return value || undefined;
}

function decodeBase64Url(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  try {
    const decoded = Buffer.from(normalized, 'base64');
    return decoded.subarray(0, MAX_BODY_BYTES).toString('utf8');
  } catch {
    return '';
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>(?=\s*)/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, MAX_BODY_BYTES);
}

function parseReceivedAt(internalDate: unknown, dateHeader?: string): string {
  const millis = typeof internalDate === 'string' && /^\d{1,14}$/.test(internalDate) ? Number(internalDate) : NaN;
  const date = Number.isFinite(millis) ? new Date(millis) : new Date(dateHeader || '');
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function parseScopes(value: unknown): string[] {
  return typeof value === 'string' ? value.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean).slice(0, 20) : [];
}

function errorCode(value: unknown, fallback: string): string {
  const body = record(value);
  const nested = record(body.error);
  const candidate = safeText(nested.error || body.error || body.status || body.message, 80).toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
  return candidate || fallback;
}

function encodedPath(value: string): string { return encodeURIComponent(value); }

/**
 * Server-side Google OAuth/Gmail adapter. It deliberately keeps provider
 * response shapes here; radar-engine receives only the normalized contract.
 * All HTTP calls use the injected fetch implementation in tests, so the
 * adapter itself has no network dependency or test fixtures.
 */
export class GoogleGmailProvider implements GmailProviderPort {
  private readonly request: typeof fetch;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly tokenEndpoint: string;
  private readonly revokeEndpoint: string;
  private readonly userInfoEndpoint: string;
  private readonly tokenInfoEndpoint: string;
  private readonly gmailApiBase: string;

  constructor(clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET, options: GoogleGmailProviderOptions = {}) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.request = options.fetch ?? fetch;
    this.tokenEndpoint = options.tokenEndpoint ?? TOKEN_ENDPOINT;
    this.revokeEndpoint = options.revokeEndpoint ?? REVOKE_ENDPOINT;
    this.userInfoEndpoint = options.userInfoEndpoint ?? USERINFO_ENDPOINT;
    this.tokenInfoEndpoint = options.tokenInfoEndpoint ?? TOKENINFO_ENDPOINT;
    this.gmailApiBase = (options.gmailApiBase ?? GMAIL_API).replace(/\/$/, '');
  }

  buildAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string; codeChallenge: string }): string {
    const params = new URLSearchParams({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: GMAIL_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private async json(url: string, init: RequestInit, fallback: string): Promise<JsonRecord> {
    let response: Response;
    try {
      response = await this.request(url, { ...init, signal: init.signal ?? AbortSignal.timeout(15_000) });
    } catch {
      throw new Error('gmail_provider_unavailable');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`gmail_google_${response.status}_${errorCode(body, fallback)}`);
    return record(body);
  }

  private async tokenRequest(params: URLSearchParams): Promise<JsonRecord> {
    if (!this.clientId || !this.clientSecret) throw new Error('gmail_provider_not_configured');
    params.set('client_id', this.clientId);
    params.set('client_secret', this.clientSecret);
    return this.json(this.tokenEndpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: params.toString() }, 'token_request_failed');
  }

  private async identity(accessToken: string): Promise<{ googleSubjectId: string; accountEmail: string }> {
    // Userinfo is preferred when the deployment's OAuth consent includes the
    // standard identity grant. Tokeninfo also exposes Google's stable user id
    // for Gmail user grants, and avoids persisting an email as an identifier.
    try {
      const body = await this.json(this.userInfoEndpoint, { headers: { authorization: `Bearer ${accessToken}` } }, 'userinfo_failed');
      const subject = safeText(body.sub, 200);
      const email = safeText(body.email, 320);
      const verified = body.email_verified === undefined || body.email_verified === true;
      if (subject && email && verified) return { googleSubjectId: subject, accountEmail: email };
    } catch { /* fall through to tokeninfo */ }
    try {
      const url = new URL(this.tokenInfoEndpoint);
      url.searchParams.set('access_token', accessToken);
      const body = await this.json(url.toString(), { headers: { accept: 'application/json' } }, 'tokeninfo_failed');
      const subject = safeText(body.user_id || body.sub, 200);
      const email = safeText(body.email, 320);
      const verified = body.verified_email === undefined || body.verified_email === true;
      if (subject && email && verified) return { googleSubjectId: subject, accountEmail: email };
      if (subject) {
        const profile = await this.gmailRequest('/users/me/profile', accessToken);
        const profileEmail = safeText(profile.emailAddress, 320);
        if (profileEmail) return { googleSubjectId: subject, accountEmail: profileEmail };
      }
    } catch { /* produce one privacy-safe provider error below */ }
    throw new Error('gmail_identity_unavailable');
  }

  private async gmailRequest(path: string, accessToken: string, init: RequestInit = {}): Promise<JsonRecord> {
    return this.json(`${this.gmailApiBase}${path}`, { ...init, headers: { accept: 'application/json', ...(init.headers ?? {}), authorization: `Bearer ${accessToken}` } }, 'gmail_request_failed');
  }

  async exchangeCode(input: { code: string; redirectUri: string; codeVerifier: string }): Promise<GmailTokenExchange> {
    const body = await this.tokenRequest(new URLSearchParams({ code: input.code, redirect_uri: input.redirectUri, grant_type: 'authorization_code', code_verifier: input.codeVerifier }));
    const accessToken = safeText(body.access_token, 2_000);
    const refreshToken = safeText(body.refresh_token, 4_000);
    if (!accessToken || !refreshToken) throw new Error('gmail_refresh_token_missing');
    const identity = await this.identity(accessToken);
    const grantedScopes = parseScopes(body.scope);
    if (!grantedScopes.includes(GMAIL_SCOPE)) throw new Error('gmail_scope_mismatch');
    return { ...identity, refreshToken, grantedScopes };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
    const body = await this.tokenRequest(new URLSearchParams({ refresh_token: refreshToken, grant_type: 'refresh_token' }));
    const accessToken = safeText(body.access_token, 2_000);
    const expiresIn = Number(body.expires_in);
    if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error('gmail_access_token_missing');
    return { accessToken, expiresAt: new Date(Date.now() + Math.min(expiresIn, 86_400) * 1_000).toISOString() };
  }

  async revokeToken(refreshToken: string): Promise<void> {
    await this.json(this.revokeEndpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: new URLSearchParams({ token: refreshToken }).toString() }, 'revoke_failed');
  }

  async watchMailbox(accessToken: string): Promise<{ historyId: string; expiration: string }> {
    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topicName) throw new Error('gmail_pubsub_not_configured');
    const body = await this.gmailRequest('/users/me/watch', accessToken, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topicName, labelIds: ['INBOX'] }) });
    const historyId = safeText(body.historyId, 200);
    const expirationRaw = Number(body.expiration);
    if (!historyId || !Number.isFinite(expirationRaw)) throw new Error('gmail_watch_invalid_response');
    return { historyId, expiration: new Date(expirationRaw).toISOString() };
  }

  async stopWatch(accessToken: string): Promise<void> {
    await this.gmailRequest('/users/me/stop', accessToken, { method: 'POST' });
  }

  async listMessages(accessToken: string, query: { after: string; labelIds?: string[]; senderDomain?: string; max: number }): Promise<Array<{ id: string; threadId?: string; historyId?: string }>> {
    const url = new URL(`${this.gmailApiBase}/users/me/messages`);
    const q = [query.after ? `after:${query.after}` : '', query.senderDomain ? `from:${query.senderDomain.replace(/[^a-z0-9._-]/gi, '')}` : ''].filter(Boolean).join(' ');
    if (q) url.searchParams.set('q', q);
    for (const label of (query.labelIds ?? []).slice(0, 20)) url.searchParams.append('labelIds', label.slice(0, 100));
    url.searchParams.set('maxResults', String(Math.max(1, Math.min(500, Math.floor(query.max || 500)))));
    const body = await this.gmailRequest(`${url.pathname}${url.search}`, accessToken);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    return messages.slice(0, 500).flatMap((item) => {
      const message = record(item); const id = safeText(message.id, 200); if (!id) return [];
      return [{ id, ...(safeText(message.threadId, 200) ? { threadId: safeText(message.threadId, 200) } : {}) }];
    });
  }

  async getMessageMetadata(accessToken: string, messageId: string): Promise<{ from?: string; subject: string; receivedAt: string }> {
    const params = new URLSearchParams({ format: 'metadata' });
    for (const name of ['From', 'Subject', 'Date']) params.append('metadataHeaders', name);
    const body = await this.gmailRequest(`/users/me/messages/${encodedPath(messageId)}?${params.toString()}`, accessToken);
    const payload = record(body.payload); const headers = Array.isArray(payload.headers) ? payload.headers as Array<{ name?: unknown; value?: unknown }> : [];
    const subject = headerValue(headers, 'subject') || '(no subject)';
    return { ...(headerValue(headers, 'from') ? { from: headerValue(headers, 'from') } : {}), subject, receivedAt: parseReceivedAt(body.internalDate, headerValue(headers, 'date')) };
  }

  async getMessageText(accessToken: string, messageId: string): Promise<InboundEmailEnvelope> {
    const body = await this.gmailRequest(`/users/me/messages/${encodedPath(messageId)}?format=full`, accessToken);
    const payload = record(body.payload);
    const rootHeaders = Array.isArray(payload.headers) ? payload.headers as Array<{ name?: unknown; value?: unknown }> : [];
    const plain: string[] = []; const html: string[] = []; const attachments: InboundEmailEnvelope['attachments'] = [];
    const visit = (part: JsonRecord) => {
      const mime = safeText(part.mimeType, 120).toLowerCase(); const filename = safeText(part.filename, 180);
      const partBody = record(part.body); const isAttachment = Boolean(filename || partBody.attachmentId); const data = isAttachment ? '' : decodeBase64Url(partBody.data);
      if (mime === 'text/plain' && data) plain.push(data); else if (mime === 'text/html' && data) html.push(data);
      if (filename || (partBody.attachmentId && !data)) attachments.push({ filename: filename || 'attachment', contentType: mime || 'application/octet-stream', byteLength: Math.max(0, Math.min(Number(partBody.size) || 0, 50 * 1024 * 1024)) });
      for (const child of (Array.isArray(part.parts) ? part.parts : [])) visit(record(child));
    };
    visit(payload);
    const from = headerValue(rootHeaders, 'from'); const to = (headerValue(rootHeaders, 'to') || '').split(',').map((value) => safeText(value, 320)).filter(Boolean);
    const htmlText = html.length ? htmlToText(html.join('\n')) : ''; const textBody = (plain.join('\n') || htmlText).slice(0, MAX_BODY_BYTES);
    const auth = headerValue(rootHeaders, 'authentication-results');
    const authResults = auth ? { ...( /\bspf=pass\b/i.test(auth) ? { spf: 'pass' as const } : /\bspf=fail\b/i.test(auth) ? { spf: 'fail' as const } : {}), ...( /\bdkim=pass\b/i.test(auth) ? { dkim: 'pass' as const } : /\bdkim=fail\b/i.test(auth) ? { dkim: 'fail' as const } : {}), ...( /\bdmarc=pass\b/i.test(auth) ? { dmarc: 'pass' as const } : /\bdmarc=fail\b/i.test(auth) ? { dmarc: 'fail' as const } : {}) } : undefined;
    const safeHeaders: Record<string, string> = {};
    for (const name of ['message-id', 'reply-to', 'resent-from', 'authentication-results']) { const value = headerValue(rootHeaders, name); if (value) safeHeaders[name] = value; }
    return { provider: 'gmail-sync', providerMessageId: safeText(body.id, 200) || messageId, ...(from ? { from } : {}), ...(headerValue(rootHeaders, 'reply-to') ? { replyTo: headerValue(rootHeaders, 'reply-to') } : {}), ...(headerValue(rootHeaders, 'resent-from') ? { resentFrom: headerValue(rootHeaders, 'resent-from') } : {}), receivedAt: parseReceivedAt(body.internalDate, headerValue(rootHeaders, 'date')), to, subject: headerValue(rootHeaders, 'subject') || '(no subject)', ...(textBody ? { textBody } : {}), ...(headerValue(rootHeaders, 'message-id') ? { messageIdHeader: headerValue(rootHeaders, 'message-id') } : {}), headers: safeHeaders, attachments, ...(authResults ? { authResults } : {}) };
  }

  async listHistory(accessToken: string, historyId: string): Promise<{ historyId: string; messageIds: string[] }> {
    const url = new URL(`${this.gmailApiBase}/users/me/history`); url.searchParams.set('startHistoryId', historyId); url.searchParams.set('historyTypes', 'messageAdded');
    const body = await this.gmailRequest(`${url.pathname}${url.search}`, accessToken);
    const ids = new Set<string>();
    for (const item of (Array.isArray(body.history) ? body.history : [])) {
      const history = record(item); for (const added of (Array.isArray(history.messagesAdded) ? history.messagesAdded : [])) { const message = record(record(added).message); const id = safeText(message.id, 200); if (id) ids.add(id); }
    }
    const next = safeText(body.historyId, 200) || historyId;
    return { historyId: next, messageIds: [...ids] };
  }
}
