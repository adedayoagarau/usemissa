/** Keep auth return paths same-origin and within the app. */
export function safeAuthRedirect(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/opportunities';
  return value;
}

export type AuthIntent = {
  kind: 'save-to-tracker';
  opportunityId: string;
};

/** Parse only explicit, bounded actions that may be resumed after auth. */
export function safeAuthIntent(value: string | undefined): AuthIntent | undefined {
  if (!value) return undefined;
  const match = /^save:([a-zA-Z0-9_-]{1,200})$/u.exec(value);
  if (!match?.[1]) return undefined;
  return { kind: 'save-to-tracker', opportunityId: match[1] };
}

export function serializeAuthIntent(intent: AuthIntent | undefined): string | undefined {
  if (!intent) return undefined;
  return `save:${intent.opportunityId}`;
}
