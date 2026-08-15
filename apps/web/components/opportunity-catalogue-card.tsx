'use client';

import Link from 'next/link';
import { Bookmark, CalendarDays, MapPin, Tag } from 'lucide-react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { SaveToTrackerButton } from '@/components/save-to-tracker-button';
import { OpportunityIdentityMedia } from '@/components/opportunity-identity-media';
import styles from './opportunity-catalogue-card.module.css';

function typeLabel(type: OpportunityBrowseProjection['type']): string {
  if (type === 'open-call') return 'Open call';
  return type.replace(/-/gu, ' ').replace(/^./u, (character) => character.toUpperCase());
}

function deadlineLabel(deadline: OpportunityBrowseProjection['deadline']): string {
  if (!deadline.date) {
    if (deadline.kind === 'rolling') return 'Rolling';
    if (deadline.kind === 'until-filled') return 'Until filled';
    return 'Deadline not listed';
  }
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${deadline.date}T12:00:00`),
  );
}

function feeLabel(item: OpportunityBrowseProjection): string {
  if (item.fee.status === 'no-fee') return 'No fee';
  if (item.fee.status === 'unknown') return 'Fee not listed';
  if (item.fee.amountCents !== undefined && item.fee.currency) {
    const currency = /^[A-Z]{3}$/u.test(item.fee.currency) ? item.fee.currency : undefined;
    if (currency) {
      return new Intl.NumberFormat('en', { style: 'currency', currency }).format(item.fee.amountCents / 100);
    }
    return `${item.fee.currency}${(item.fee.amountCents / 100).toFixed(2)}`;
  }
  return 'Application fee';
}

export function OpportunityCatalogueCard({
  item,
  signedIn,
}: {
  item: OpportunityBrowseProjection;
  signedIn: boolean;
}) {
  const detailHref = `/opportunities/${item.slug}`;
  const loginIntent = `/login?next=${encodeURIComponent(detailHref)}&intent=${encodeURIComponent(`save:${item.id}`)}`;
  const practices = Array.from(new Set([item.discipline, ...item.genres].filter((value): value is string => Boolean(value)))).slice(0, 2);

  return (
    <article className={styles.card}>
      <Link href={detailHref} className={styles.openLink} aria-label={`View ${item.title}`}>
        <OpportunityIdentityMedia item={item} />
        <span className={styles.body}>
          {item.status === 'closed' || item.status === 'archived' ? <span className={styles.closedBadge}>Closed</span> : null}
          <span className={styles.type}>{typeLabel(item.type)}</span>
          <span className={styles.title}>{item.title}</span>
          <span className={styles.organization}>{item.organizationName ?? 'Organization not confirmed'}</span>
          {practices.length ? <span className={styles.practices}>{practices.join(' · ')}</span> : null}
          <span className={styles.facts}>
            <span><CalendarDays aria-hidden="true" />{deadlineLabel(item.deadline)}</span>
            <span><Tag aria-hidden="true" />{feeLabel(item)}</span>
            <span><MapPin aria-hidden="true" />{item.location ?? 'Location not listed'}</span>
          </span>
        </span>
      </Link>
      <div className={styles.save}>
        {signedIn ? (
          <SaveToTrackerButton opportunityId={item.id} tracked={item.personal?.tracked} compact />
        ) : (
          <Link href={loginIntent} className={styles.saveLink} aria-label={`Log in to save ${item.title} to Tracker`}>
            <Bookmark aria-hidden="true" />
          </Link>
        )}
        <span aria-hidden="true">{item.personal?.tracked ? 'In Tracker' : 'Save'}</span>
      </div>
    </article>
  );
}
