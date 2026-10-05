import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

/** Paths that are never useful to crawlers: APIs, admin, auth, and internal prototypes. */
const ROBOTS_DISALLOW = ['/api/', '/admin', '/design-system', '/auth/'];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();
  const disallow = ROBOTS_DISALLOW;
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow },
      { userAgent: 'GPTBot', allow: '/', disallow },
      { userAgent: 'ChatGPT-User', allow: '/', disallow },
      { userAgent: 'ClaudeBot', allow: '/', disallow },
      { userAgent: 'PerplexityBot', allow: '/', disallow },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
