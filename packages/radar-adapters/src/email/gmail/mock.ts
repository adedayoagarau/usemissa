import type { GmailProviderPort, GmailTokenExchange } from '@missa/radar-engine';
import type { InboundEmailEnvelope } from '@missa/radar-engine';

/** Deterministic, zero-network provider used by unit/E2E fixtures. */
export class MockGmailProvider implements GmailProviderPort {
  readonly exchangedCodes = new Map<string, GmailTokenExchange>();
  readonly messages = new Map<string, InboundEmailEnvelope>();
  buildAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string; codeChallenge: string }): string { const url = new URL('https://mock.gmail.test/oauth'); for (const [key, value] of Object.entries(input)) url.searchParams.set(key, value); return url.toString(); }
  async exchangeCode(input: { code: string; redirectUri: string; codeVerifier: string }): Promise<GmailTokenExchange> { const exchange = this.exchangedCodes.get(input.code); if (!exchange) throw new Error('invalid_grant'); return exchange; }
  async refreshAccessToken(_refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> { return { accessToken: 'mock-access-token', expiresAt: new Date(Date.now() + 3_600_000).toISOString() }; }
  async revokeToken(_refreshToken: string): Promise<void> {}
  async watchMailbox(_accessToken: string): Promise<{ historyId: string; expiration: string }> { return { historyId: 'mock-history-1', expiration: new Date(Date.now() + 7 * 86_400_000).toISOString() }; }
  async stopWatch(_accessToken: string): Promise<void> {}
  async listMessages(_accessToken: string, _query: { after: string; labelIds?: string[]; senderDomain?: string; max: number }): Promise<Array<{ id: string; threadId?: string; historyId?: string }>> { return [...this.messages.keys()].slice(0, _query.max).map((id) => ({ id })); }
  async getMessageMetadata(_accessToken: string, messageId: string): Promise<{ from?: string; subject: string; receivedAt: string }> { const message = this.messages.get(messageId); if (!message) throw new Error('not_found'); return { from: message.from, subject: message.subject, receivedAt: message.receivedAt }; }
  async getMessageText(_accessToken: string, messageId: string): Promise<InboundEmailEnvelope> { const message = this.messages.get(messageId); if (!message) throw new Error('not_found'); return message; }
  async listHistory(_accessToken: string, historyId: string): Promise<{ historyId: string; messageIds: string[] }> { return { historyId, messageIds: [...this.messages.keys()] }; }
}
