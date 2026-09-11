import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveMagazineSchedule,
  parseReadingWindows,
} from '../src/availability/magazineSchedule.js';

test('parseReadingWindows correctly extracts standard month ranges', () => {
  const windows = parseReadingWindows('September 1 to December 1');
  assert.equal(windows.length, 1);
  assert.equal(windows[0].startMonth, 8); // Sept
  assert.equal(windows[0].startDay, 1);
  assert.equal(windows[0].endMonth, 11); // Dec
  assert.equal(windows[0].endDay, 1);
});

test('parseReadingWindows correctly extracts multiple windows', () => {
  const windows = parseReadingWindows('Jan 1 - Mar 31, Aug 1 - Oct 31');
  assert.equal(windows.length, 2);
  assert.equal(windows[0].startMonth, 0); // Jan
  assert.equal(windows[0].endMonth, 2); // Mar
  assert.equal(windows[1].startMonth, 7); // Aug
  assert.equal(windows[1].endMonth, 9); // Oct
});

test('resolveMagazineSchedule returns always_open for year-round keywords', () => {
  const testCases = [
    'Submissions are accepted year-round.',
    'Year round reading period',
    'Rolling submissions',
    'Open year-round with no reading fee',
    'Always open for poetry and fiction',
    'Continuous reading cycle',
    'Ongoing intake throughout the year',
  ];

  for (const text of testCases) {
    const res = resolveMagazineSchedule({ readingPeriod: text });
    assert.equal(res.state, 'always_open', `Failed for "${text}"`);
    assert.equal(res.badgeLabel, 'Always open');
    assert.equal(res.tone, 'success');
  }
});

test('resolveMagazineSchedule recognizes active window as open now', () => {
  // Reference date: September 15, 2026
  const now = new Date(2026, 8, 15, 12, 0, 0);
  const res = resolveMagazineSchedule({
    readingPeriod: 'September 1 to December 1',
    now,
  });

  assert.equal(res.state, 'open');
  assert.equal(res.badgeLabel, 'Open now');
  assert.equal(res.tone, 'success');
  assert.equal(res.nextDate, '2026-12-01');
});

test('resolveMagazineSchedule recognizes window closing soon (within 14 days)', () => {
  // Reference date: November 27, 2026 (closes Dec 1 = 4 days left)
  const now = new Date(2026, 10, 27, 12, 0, 0);
  const res = resolveMagazineSchedule({
    readingPeriod: 'September 1 to December 1',
    now,
  });

  assert.equal(res.state, 'closing_soon');
  assert.match(res.badgeLabel, /Closes in \d+ days/);
  assert.equal(res.tone, 'warning');
});

test('resolveMagazineSchedule returns "Opens in 2 months" for window starting in 60 days', () => {
  // Reference date: July 2, 2026. Window starts Sept 1 (approx 61 days)
  const now = new Date(2026, 6, 2, 12, 0, 0);
  const res = resolveMagazineSchedule({
    readingPeriod: 'September 1 to December 1',
    now,
  });

  assert.equal(res.state, 'opening_soon');
  assert.equal(res.badgeLabel, 'Opens in 2 months');
  assert.equal(res.tone, 'info');
  assert.equal(res.nextDate, '2026-09-01');
});

test('resolveMagazineSchedule returns "Opens in 3 weeks" for window starting in 21 days', () => {
  // Reference date: August 11, 2026. Window starts Sept 1 (21 days)
  const now = new Date(2026, 7, 11, 12, 0, 0);
  const res = resolveMagazineSchedule({
    readingPeriod: 'September 1 to December 1',
    now,
  });

  assert.equal(res.state, 'opening_soon');
  assert.equal(res.badgeLabel, 'Opens in 3 weeks');
  assert.equal(res.tone, 'info');
});

test('resolveMagazineSchedule handles year wrap-around correctly', () => {
  // Window: October 1 through February 15
  // Case A: currently in window (January 10, 2027) -> Open now
  const janNow = new Date(2027, 0, 10, 12, 0, 0);
  const janRes = resolveMagazineSchedule({
    readingPeriod: 'October 1 through February 15',
    now: janNow,
  });
  assert.equal(janRes.state, 'open');
  assert.equal(janRes.badgeLabel, 'Open now');

  // Case B: upcoming in 2 months (August 1, 2026 -> Oct 1 = 2 months)
  const augNow = new Date(2026, 7, 1, 12, 0, 0);
  const augRes = resolveMagazineSchedule({
    readingPeriod: 'October 1 through February 15',
    now: augNow,
  });
  assert.equal(augRes.state, 'opening_soon');
  assert.equal(augRes.badgeLabel, 'Opens in 2 months');
  assert.equal(augRes.nextDate, '2026-10-01');
});

test('resolveMagazineSchedule handles multi-window schedules', () => {
  // Reading period: "Jan 1 - Mar 31, Aug 1 - Oct 31"
  // On July 15: nearest is Aug 1 (17 days = ~2 weeks)
  const now = new Date(2026, 6, 15, 12, 0, 0);
  const res = resolveMagazineSchedule({
    readingPeriod: 'Jan 1 - Mar 31, Aug 1 - Oct 31',
    now,
  });
  assert.equal(res.state, 'opening_soon');
  assert.equal(res.badgeLabel, 'Opens in 2 weeks');
  assert.equal(res.nextDate, '2026-08-01');
});

test('resolveMagazineSchedule prioritizes active live opportunity deadlines', () => {
  // Reference date: Sept 10, 2026
  const now = new Date(2026, 8, 10, 12, 0, 0);
  const res = resolveMagazineSchedule({
    readingPeriod: 'Year-round',
    opportunities: [
      {
        id: 'opp_1',
        title: 'Fall Poetry Issue',
        status: 'open',
        deadline: '2026-09-15',
      },
    ],
    now,
  });

  assert.equal(res.state, 'closing_soon');
  assert.equal(res.badgeLabel, 'Closes in 5 days');
  assert.equal(res.tone, 'warning');
});

test('resolveMagazineSchedule handles empty or unparseable text gracefully', () => {
  assert.equal(resolveMagazineSchedule({ readingPeriod: null }).state, 'unknown');
  assert.equal(resolveMagazineSchedule({ readingPeriod: '' }).state, 'unknown');
  const check = resolveMagazineSchedule({ readingPeriod: 'Varies widely by genre.' });
  assert.equal(check.state, 'unknown');
  assert.equal(check.badgeLabel, 'Check schedule');
});
