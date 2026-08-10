import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteUrl } from '@/lib/siteUrl';

export const SITE_NAME = 'Missa';
export const DEFAULT_DESCRIPTION = 'Find submission opportunities that fit your work, prepare with context, and keep every deadline in view.';

export function absoluteUrl(path = '/'): string {
  return new URL(path, `${siteUrl()}/`).toString();
}

export function pageMetadata(input: { title: string; description: string; path: string; noIndex?: boolean }): Metadata {
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
    },
    twitter: {
      card: 'summary',
      title: input.title,
      description: input.description,
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

export function opportunityDescription(item: { title: string; organizationName?: string; type: string; deadline: { date?: string; raw?: string; kind: string }; fee: { status: string; amountCents?: number; currency?: string }; location?: string; content?: { summary?: string } }): string {
  if (item.content?.summary) return item.content.summary;
  const organization = item.organizationName ? ` from ${item.organizationName}` : '';
  const type = item.type.replaceAll('-', ' ');
  const article = /^[aeiou]/i.test(type) ? 'an' : 'a';
  const deadline = item.deadline.date ? `Deadline: ${new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(`${item.deadline.date}T12:00:00`))}.` : item.deadline.raw ? `Deadline: ${item.deadline.raw}.` : item.deadline.kind === 'rolling' ? 'Rolling deadline.' : item.deadline.kind === 'until-filled' ? 'Open until filled.' : 'Deadline needs confirmation.';
  const fee = item.fee.status === 'no-fee' ? 'No application fee.' : item.fee.status === 'paid' ? 'An application fee is listed.' : 'Fee unclear.';
  const location = item.location ? ` Location: ${item.location}.` : '';
  return `${item.title}${organization} is listed as ${article} ${type}. ${deadline} ${fee}${location} Confirm the official source before applying.`.slice(0, 300);
}
