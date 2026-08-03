import type { RadarStore } from '../store/store.js';

export interface UserProp {
  id: string;
  title: string;
  detail: string;
  earnedAt: string;
}

/**
 * Small, opt-out-ready encouragement projection. Props describe progress and
 * never turn a rejection, deadline miss, or missing profile field into a
 * negative score. They are derived from private owner data and have no public
 * or organization projection.
 */
export function propsForUser(store: RadarStore, userId: string): UserProp[] {
  const tracked = store.tracked.filter((item) => item.userId === userId);
  const manual = store.manualTrackerEntries.filter((item) => item.userId === userId);
  const all = [...tracked.map((item) => ({ at: item.trackedAt, status: item.myStatus })), ...manual.map((item) => ({ at: item.importedAt, status: item.myStatus }))].sort((a, b) => a.at.localeCompare(b.at));
  const props: UserProp[] = [];
  if (all.length >= 1) props.push({ id: 'first-opportunity', title: 'You started a shortlist', detail: 'Your first opportunity is in Missa.', earnedAt: all[0].at });
  if (all.length >= 5) props.push({ id: 'five-opportunities', title: 'You are building range', detail: 'Five opportunities are now in your working set.', earnedAt: all[4].at });
  const prepared = all.find((item) => item.status === 'preparing' || item.status === 'draft-started' || item.status === 'ready-to-submit');
  if (prepared) props.push({ id: 'first-preparation', title: 'You made room to prepare', detail: 'A saved opportunity moved from browsing into preparation.', earnedAt: prepared.at });
  const submitted = all.find((item) => item.status === 'submitted' || item.status === 'received' || item.status === 'in-review' || item.status === 'accepted' || item.status === 'declined');
  if (submitted) props.push({ id: 'first-submission', title: 'You sent work out', detail: 'Your first submission is part of your record.', earnedAt: submitted.at });
  return props.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
}
