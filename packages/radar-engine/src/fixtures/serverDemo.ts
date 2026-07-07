import { FixtureFetcher } from '../ingestion/fetcher.js';
import { RadarEngine } from '../engine.js';
import { addDays, isoDateOf } from '../extraction/dates.js';
import { systemClock, type Clock } from '../ports.js';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function prose(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export interface DemoCredential {
  email: string;
  password: string;
  accountId: string;
}

export interface ServerDemoWorld {
  engine: RadarEngine;
  fetcher: FixtureFetcher;
  userIds: { ada: string; ben: string };
  organizationIds: { northRiver: string; hilltop: string };
  /** Seeded login credentials, for the CLI to print and tests to log in with. */
  credentials: {
    ada: DemoCredential;
    ben: DemoCredential;
    /** Represents North River Review — its domain-matched claim auto-approves. */
    northRiverRep: DemoCredential;
    admin: DemoCredential;
  };
}

/**
 * Demo world for the live server: same cast as the test fixtures, but every
 * date is generated relative to "today" so the loop is always alive —
 * one call closing within the reminder ladder, one conflicted grant, one
 * suspicious contest, one festival, one call opening soon.
 */
export function buildServerDemoWorld(clock: Clock = systemClock): ServerDemoWorld {
  const today = isoDateOf(clock.now());
  const fetcher = new FixtureFetcher();
  const engine = new RadarEngine({ fetcher, clock });

  const northRiver = engine.addOrganization({ name: 'North River Review', domains: ['northriverreview.org'], verified: true });
  const hilltop = engine.addOrganization({ name: 'Hilltop Foundation', domains: ['hilltop.org'], verified: false });

  fetcher.setPage(
    'https://northriverreview.org/submissions',
    `North River Review — Call for Submissions
Published by: North River Review
Submissions open for our next issue. We are now accepting poetry, fiction, and creative nonfiction.
Submit up to 5 poems or one short story. Include a bio and cover letter.
Deadline: ${prose(addDays(today, 6))}. No entry fee. Simultaneous submissions are welcome.
Submit at: https://northriverreview.org/submit
Questions? editors@northriverreview.org`,
  );
  engine.addSource({ name: 'North River Review', url: 'https://northriverreview.org/submissions', kind: 'organization-website', organizationId: northRiver.id });

  fetcher.setPage(
    'https://hilltop.org/grant',
    `Hilltop Foundation Arts Grant
Presented by: Hilltop Foundation
Applications are open for our annual arts grant. Grant of $25,000 for arts nonprofits.
Eligibility: applicants must hold 501(c)(3) status. Include a project proposal and budget.
Applications due ${prose(addDays(today, 45))}. No application fee.
Apply at: https://hilltop.org/grant/apply
Contact: grants@hilltop.org`,
  );
  engine.addSource({ name: 'Hilltop Foundation', url: 'https://hilltop.org/grant', kind: 'organization-website', organizationId: hilltop.id });

  fetcher.setPage(
    'https://opportunity-directory.example/hilltop-grant',
    `Hilltop Foundation Arts Grant
Presented by: Hilltop Foundation
Annual grant for arts organizations. Applications due ${prose(addDays(today, 60))}.
Apply at: https://hilltop.org/grant/apply`,
  );
  engine.addSource({ name: 'Opportunity Directory', url: 'https://opportunity-directory.example/hilltop-grant', kind: 'directory' });

  fetcher.setPage(
    'https://goldenquill.example/contest',
    `Golden Quill Global Writing Contest
Win $50,000! Now accepting all fiction. Deadline: ${prose(addDays(today, 30))}.
Entry fee: $5. Winners must pay a processing fee to receive their prize via wire transfer.`,
  );
  engine.addSource({ name: 'Golden Quill', url: 'https://goldenquill.example/contest', kind: 'directory' });

  fetcher.setPage(
    'https://lanterncityfest.com/entries',
    `Lantern City Film Festival — Call for Entries
Hosted by: Lantern City Film Festival
Call for entries: documentary and short film. Films must have a regional premiere available.
Submissions close ${prose(addDays(today, 80))}. Entry fee: $40.
Submit at: https://lanterncityfest.com/apply
Contact: program@lanterncityfest.com`,
  );
  engine.addSource({ name: 'Lantern City Film Festival', url: 'https://lanterncityfest.com/entries', kind: 'organization-website' });

  fetcher.setPage(
    'https://stonebrook.example/residency',
    `Stonebrook Writers Residency
Hosted by: Stonebrook Arts Center
Our residency program opens ${prose(addDays(today, 10))} and closes ${prose(addDays(today, 55))}.
Open to emerging writers. Include a cv and work sample. No application fee.
Contact: residency@stonebrook.example`,
  );
  engine.addSource({ name: 'Stonebrook Arts Center', url: 'https://stonebrook.example/residency', kind: 'organization-website' });

  const adaPassword = 'poetry-and-fiction';
  const { account: adaAccount, user: ada } = engine.signUp('ada@example.com', adaPassword, 'Ada', ['poetry', 'fiction'], {
    'career-stage': 'emerging',
  });
  engine.createRadarProfile(ada.id, 'No-fee poetry & fiction', { genres: ['poetry', 'fiction'], noFeeOnly: true });
  engine.followOrganization(ada.id, northRiver.id);

  const benPassword = 'documentary-films';
  const { account: benAccount, user: ben } = engine.signUp('ben@example.com', benPassword, 'Ben', ['documentary'], {
    'premiere-status': 'regional-premiere',
  });
  engine.createRadarProfile(ben.id, 'Film festivals under $50', { types: ['festival'], maxFeeCents: 5000 });

  const repPassword = 'north-river-editor';
  const { account: repAccount } = engine.signUp('editor@northriverreview.org', repPassword, 'North River Editor');

  const adminPassword = 'radar-admin-seed';
  const { account: adminAccount } = engine.signUp('admin@missa.dev', adminPassword, 'Missa Admin');
  engine.promoteToAdmin(adminAccount.id);

  return {
    engine,
    fetcher,
    userIds: { ada: ada.id, ben: ben.id },
    organizationIds: { northRiver: northRiver.id, hilltop: hilltop.id },
    credentials: {
      ada: { email: 'ada@example.com', password: adaPassword, accountId: adaAccount.id },
      ben: { email: 'ben@example.com', password: benPassword, accountId: benAccount.id },
      northRiverRep: { email: 'editor@northriverreview.org', password: repPassword, accountId: repAccount.id },
      admin: { email: 'admin@missa.dev', password: adminPassword, accountId: adminAccount.id },
    },
  };
}
