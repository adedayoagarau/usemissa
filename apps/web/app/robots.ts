import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();
  // The public catalogue, directory and rankings are launched surfaces and
  // should be discoverable. Account, workspace and API routes stay out of
  // the index.
  const disallow = [
    '/api/',
    '/admin',
    '/workspace',
    '/tracker',
    '/calendar',
    '/submissions',
    '/settings',
    '/profile',
    '/onboarding',
    '/reviews',
    '/organization',
    '/org/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
  ];
  const crawlerRules = {
    allow: '/',
    disallow,
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
