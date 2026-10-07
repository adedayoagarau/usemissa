/**
 * Mailbox providers anyone can sign up to. An address at one of these is a
 * person's inbox, not an organization's, so a public profile never shows it.
 */
const FREE_MAIL_DOMAINS = new Set([
  'aol.com',
  'gmail.com',
  'googlemail.com',
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'hey.com',
  'hotmail.com',
  'hotmail.co.uk',
  'icloud.com',
  'live.com',
  'mac.com',
  'mail.com',
  'mail.ru',
  'me.com',
  'msn.com',
  'naver.com',
  'outlook.com',
  'pm.me',
  'proton.me',
  'protonmail.com',
  'qq.com',
  'rocketmail.com',
  'tutanota.com',
  'web.de',
  'yahoo.com',
  'yahoo.co.uk',
  'yandex.com',
  'yandex.ru',
  'ymail.com',
  'zoho.com',
]);

const EMAIL_RE = /^[^\s@/]+@([^\s@/]+\.[^\s@/]+)$/u;

function bareHost(host: string): string {
  return host.toLowerCase().replace(/\.$/u, '').replace(/^www\./u, '');
}

function websiteHost(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/iu.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? bareHost(url.hostname) : null;
  } catch {
    return null;
  }
}

function isFreeMail(domain: string): boolean {
  if (FREE_MAIL_DOMAINS.has(domain)) return true;
  // Regional variants such as yahoo.fr, hotmail.it or outlook.de.
  return /^(yahoo|hotmail|outlook|live|gmx|yandex)\.[a-z.]+$/u.test(domain);
}

/**
 * The crawled contact email a public profile may show, or null.
 *
 * Crawls pick up personal inboxes as well as organization ones, and a public
 * page that prints one makes Missa a search result for that address. So the
 * email is shown only when its domain matches the profile's own website (the
 * same host, or one a subdomain of the other) and is not a free-mail provider.
 * Everything else is left off; the profile still links to the website.
 */
export function publicContactEmail(email: string | null | undefined, websiteUrl: string | null | undefined): string | null {
  const trimmed = email?.trim();
  if (!trimmed) return null;
  const match = EMAIL_RE.exec(trimmed);
  if (!match) return null;
  const domain = bareHost(match[1]);
  if (isFreeMail(domain)) return null;
  const site = websiteHost(websiteUrl);
  if (!site || isFreeMail(site)) return null;
  const sameOrganization = domain === site || domain.endsWith(`.${site}`) || site.endsWith(`.${domain}`);
  return sameOrganization ? trimmed : null;
}
