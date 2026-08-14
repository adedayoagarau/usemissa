'use client';

import { useState } from 'react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import styles from './opportunity-catalogue-card.module.css';

function initials(item: OpportunityBrowseProjection): string {
  return (item.organizationName ?? item.title)
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'M';
}

export function OpportunityIdentityMedia({ item }: { item: OpportunityBrowseProjection }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={styles.media}>
      {item.identityAssetUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.identityAssetUrl} alt={item.identityAssetAlt ?? ''} onError={() => setFailed(true)} />
      ) : (
        <span className={styles.fallback} aria-hidden="true">{initials(item)}</span>
      )}
    </span>
  );
}
