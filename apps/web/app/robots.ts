import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

/** Paths that are never useful to crawlers: APIs, admin, auth, and internal prototypes. */
const ROBOTS_DISALLOW = ['/api/', '/admin', '/design-system', '/auth/'];
/**
 * The public catalogue feed that /llms.txt points to. The longer, more
 * specific rule wins over the /api/ disallow; `$` keeps it to this path alone.
 */
const ROBOTS_ALLOW = ['/', '/api/opportunities$'];

/**
 * Search and answer-engine crawlers, named so a later `*` change cannot
 * silently drop them. Training crawlers (GPTBot, ClaudeBot) are allowed too.
 */
const NAMED_AGENTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot',
  'Bingbot',
  'Googlebot',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();
  return {
    rules: [
      { userAgent: '*', allow: ROBOTS_ALLOW, disallow: ROBOTS_DISALLOW },
      ...NAMED_AGENTS.map((userAgent) => ({ userAgent, allow: ROBOTS_ALLOW, disallow: ROBOTS_DISALLOW })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
