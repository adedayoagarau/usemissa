/** Keep auth return paths same-origin and within the app. */
export function safeAuthRedirect(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/opportunities';
  return value;
}
