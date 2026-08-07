export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || 'https://www.usemissa.com';
  const withProtocol = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  return new URL(withProtocol).origin;
}
