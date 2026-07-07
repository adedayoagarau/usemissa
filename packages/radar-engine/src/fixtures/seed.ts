import type { Clock } from '../ports.js';
import { FixtureFetcher } from '../ingestion/fetcher.js';
import { RadarEngine } from '../engine.js';

/** Deterministic, advanceable clock for demos and tests. */
export class ManualClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  advanceDays(days: number): void {
    this.current = new Date(this.current.getTime() + days * 86_400_000);
  }
}

export const MAGAZINE_PAGE_V1 = `North River Review — Call for Submissions
Published by: North River Review
Submissions open for our Spring issue. We are now accepting poetry, fiction, and creative nonfiction.
Submit up to 5 poems or one short story. Include a bio and cover letter.
Deadline: March 1, 2026. No entry fee. Simultaneous submissions are welcome.
Submit at: https://northriverreview.org/submit
Questions? editors@northriverreview.org`;

export const MAGAZINE_PAGE_V2_EXTENDED = `North River Review — Call for Submissions
Published by: North River Review
Submissions open for our Spring issue. We are now accepting poetry, fiction, and creative nonfiction.
Submit up to 5 poems or one short story. Include a bio and cover letter.
Deadline extended! Deadline: March 15, 2026. No entry fee. Simultaneous submissions are welcome.
Submit at: https://northriverreview.org/submit
Questions? editors@northriverreview.org`;

export const MAGAZINE_PAGE_V3_CLOSED = `North River Review — Call for Submissions
Published by: North River Review
Our Spring reading period has ended. Submissions are closed. Thank you to everyone who sent work.
We expect to reopen for the Fall issue. Questions? editors@northriverreview.org`;

export const GRANT_PAGE = `Hilltop Foundation Arts Grant
Presented by: Hilltop Foundation
Applications are open for our annual arts grant. Grant of $25,000 for arts nonprofits.
Eligibility: applicants must hold 501(c)(3) status. Minimum operating budget of $250,000.
Include a project proposal and budget. Applications due April 10, 2026. No application fee.
Apply at: https://hilltop.org/grant/apply
Contact: grants@hilltop.org`;

/** Same grant listed on a directory with a conflicting deadline. */
export const GRANT_DIRECTORY_LISTING = `Hilltop Foundation Arts Grant
Presented by: Hilltop Foundation
Annual grant for arts organizations. Applications due April 25, 2026.
Apply at: https://hilltop.org/grant/apply`;

export const CONTEST_PAGE_SUSPICIOUS = `Golden Quill Global Writing Contest
Win $50,000! Now accepting all fiction. Deadline: May 1, 2026.
Entry fee: $5. Winners must pay a processing fee to receive their prize via wire transfer.`;

export const FESTIVAL_PAGE = `Lantern City Film Festival — Call for Entries
Hosted by: Lantern City Film Festival
Call for entries: documentary and short film. Films must have a regional premiere available.
Submissions close September 30, 2026. Entry fee: $40.
Submit at: https://lanterncityfest.com/apply
Contact: program@lanterncityfest.com`;

export interface DemoWorld {
  engine: RadarEngine;
  fetcher: FixtureFetcher;
  clock: ManualClock;
  ids: {
    userAda: string;
    userBen: string;
    orgNorthRiver: string;
    orgHilltop: string;
    magazineSourceUrl: string;
  };
}

/**
 * Builds the demo world used by the CLI and integration tests: four seed
 * sources (magazine, grant + conflicting directory listing, suspicious
 * contest, film festival), two users with radar profiles, and two
 * organizations — one of which will claim its discovered call.
 */
export function buildDemoWorld(startDate = '2026-01-05T09:00:00Z'): DemoWorld {
  const clock = new ManualClock(new Date(startDate));
  const fetcher = new FixtureFetcher();
  const engine = new RadarEngine({ fetcher, clock });

  const northRiver = engine.addOrganization({ name: 'North River Review', domains: ['northriverreview.org'], verified: true });
  const hilltop = engine.addOrganization({ name: 'Hilltop Foundation', domains: ['hilltop.org'], verified: false });

  const magUrl = 'https://northriverreview.org/submissions';
  fetcher.setPage(magUrl, MAGAZINE_PAGE_V1);
  engine.addSource({ name: 'North River Review', url: magUrl, kind: 'organization-website', organizationId: northRiver.id, checkIntervalHours: 24 });

  fetcher.setPage('https://hilltop.org/grant', GRANT_PAGE);
  engine.addSource({ name: 'Hilltop Foundation', url: 'https://hilltop.org/grant', kind: 'organization-website', organizationId: hilltop.id, checkIntervalHours: 24 });

  fetcher.setPage('https://opportunity-directory.example/hilltop-grant', GRANT_DIRECTORY_LISTING);
  engine.addSource({ name: 'Opportunity Directory', url: 'https://opportunity-directory.example/hilltop-grant', kind: 'directory', checkIntervalHours: 24 });

  fetcher.setPage('https://goldenquill.example/contest', CONTEST_PAGE_SUSPICIOUS);
  engine.addSource({ name: 'Golden Quill', url: 'https://goldenquill.example/contest', kind: 'directory', checkIntervalHours: 24 });

  fetcher.setPage('https://lanterncityfest.com/entries', FESTIVAL_PAGE);
  engine.addSource({ name: 'Lantern City Film Festival', url: 'https://lanterncityfest.com/entries', kind: 'organization-website', checkIntervalHours: 24 });

  const ada = engine.addUser({
    displayName: 'Ada',
    genres: ['poetry', 'fiction'],
    attributes: { 'career-stage': 'emerging' },
  });
  engine.createRadarProfile(ada.id, 'No-fee poetry & fiction', {
    genres: ['poetry', 'fiction'],
    noFeeOnly: true,
  });
  engine.followOrganization(ada.id, northRiver.id);

  const ben = engine.addUser({
    displayName: 'Ben',
    genres: ['documentary'],
    attributes: { 'premiere-status': 'regional-premiere' },
  });
  engine.createRadarProfile(ben.id, 'Film festivals under $50', {
    types: ['festival'],
    maxFeeCents: 5000,
  });

  return {
    engine,
    fetcher,
    clock,
    ids: {
      userAda: ada.id,
      userBen: ben.id,
      orgNorthRiver: northRiver.id,
      orgHilltop: hilltop.id,
      magazineSourceUrl: magUrl,
    },
  };
}
