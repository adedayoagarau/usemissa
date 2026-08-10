import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();
  const crawlerRules = {
    allow: ['/', '/about', '/methodology', '/signup', '/opportunities', '/opportunities/', '/discover/', '/guides/', '/org/'],
    disallow: ['/api/', '/admin/', '/login', '/signup', '/opportunities?', '/tracker', '/library', '/calendar', '/messages', '/insights', '/my-submissions', '/workspace', '/profile/'],
  };
  return {
    rules: [
      { userAgent: '*', ...crawlerRules },
      { userAgent: 'OAI-SearchBot', ...crawlerRules },
      { userAgent: 'GPTBot', ...crawlerRules },
      { userAgent: 'ChatGPT-User', ...crawlerRules },
      { userAgent: 'ClaudeBot', ...crawlerRules },
      { userAgent: 'PerplexityBot', ...crawlerRules },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
