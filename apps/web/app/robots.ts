import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();
  const crawlerRules = {
    allow: ['/waitlist', '/privacy', '/llms.txt'],
    disallow: ['/'],
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
