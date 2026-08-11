import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteUrl } from '@/lib/siteUrl';

export const SITE_NAME = 'Missa';
export const DEFAULT_DESCRIPTION = 'Find submission opportunities that fit your work, prepare with context, and keep every deadline in view.';
const SOCIAL_IMAGE = {
  url: absoluteUrl('/opengraph-image'),
  width: 1200,
  height: 630,
  alt: 'Missa — submission opportunities tailored for creators',
};

export function absoluteUrl(path = '/'): string {
  return new URL(path, `${siteUrl()}/`).toString();
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(input.path);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }): ReactNode {
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialized }} />;
}

export function breadcrumbJsonLd(items: Array<{ name: string; path?: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function opportunityDescription(item: {
  title: string;
  organizationName?: string;
  type: string;
  deadline: { date?: string; raw?: string; kind: string };
  fee: { status: string; amountCents?: number; currency?: string };
  location?: string;
  content?: { summary?: string };
}): string {
  if (item.content?.summary) return item.content.summary;
  const organization = item.organizationName ? ` from ${item.organizationName}` : '';
  const deadline = item.deadline.date
    ? `Deadline ${item.deadline.date}`
    : item.deadline.raw ?? (item.deadline.kind === 'rolling' ? 'rolling deadline' : 'deadline to be confirmed');
  const fee = item.fee.status === 'no-fee' ? 'no fee' : item.fee.status === 'paid' ? 'paid submission' : 'fee not confirmed';
  const location = item.location ? ` Location: ${item.location}.` : '';
  return `${item.title}${organization} is a ${item.type.replaceAll('-', ' ')}. ${deadline}; ${fee}.${location} Confirm the official source before applying.`.slice(0, 300);
}
