import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteUrl } from '@/lib/siteUrl';
import { cleanCrawledNarrative, cleanTitleOrLabel } from '@/lib/textUtils';

export const SITE_NAME = 'Missa';
export const DEFAULT_DESCRIPTION = 'Find submission opportunities that fit your work, prepare with context, and keep every deadline in view.';

export function absoluteUrl(path = '/'): string {
  return new URL(path, `${siteUrl()}/`).toString();
}

export function pageMetadata(input: { title: string; description: string; path: string; noIndex?: boolean }): Metadata {
  const url = absoluteUrl(input.path);
  const cleanTitle = cleanTitleOrLabel(input.title);
  const cleanDesc = cleanCrawledNarrative(input.description);
  const socialImage = {
    url: absoluteUrl('/brand/missa-social-share.png'),
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: 'Missa, creative opportunities with their source and limits kept visible.',
  };
  return {
    title: cleanTitle,
    description: cleanDesc,
    alternates: { canonical: url },
    robots: input.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: cleanTitle,
      description: cleanDesc,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: cleanTitle,
      description: cleanDesc,
      images: [socialImage.url],
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
      name: cleanTitleOrLabel(item.name),
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function opportunityDescription(item: { title: string; organizationName?: string; type: string; deadline: { date?: string; raw?: string; kind: string }; fee: { status: string; amountCents?: number; currency?: string }; location?: string; content?: { summary?: string } }): string {
  if (item.content?.summary) return cleanCrawledNarrative(item.content.summary);
  const title = cleanTitleOrLabel(item.title);
  const organization = item.organizationName ? ` from ${cleanTitleOrLabel(item.organizationName)}` : '';
  const type = item.type.replaceAll('-', ' ');
  const article = /^[aeiou]/i.test(type) ? 'an' : 'a';
  const deadline = item.deadline.date ? `Deadline: ${new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(`${item.deadline.date}T12:00:00`))}.` : item.deadline.raw ? `Deadline: ${cleanTitleOrLabel(item.deadline.raw)}.` : item.deadline.kind === 'rolling' ? 'Rolling deadline.' : item.deadline.kind === 'until-filled' ? 'Open until filled.' : 'Deadline needs confirmation.';
  const fee = item.fee.status === 'no-fee' ? 'No application fee.' : item.fee.status === 'paid' ? 'An application fee is listed.' : 'Fee unclear.';
  const location = item.location ? ` Location: ${cleanTitleOrLabel(item.location)}.` : '';
  return `${title}${organization} is listed as ${article} ${type}. ${deadline} ${fee}${location} Confirm the official source before applying.`.slice(0, 300);
}

