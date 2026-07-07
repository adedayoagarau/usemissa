import { fitScore, type RadarEngine, type Opportunity } from '@missa/radar-engine';

/**
 * Mirrors RadarServer's private opportunityView() (packages/radar-engine/src/
 * server/server.ts) -- that method isn't part of the package's public export
 * surface, so this is a small, deliberate reimplementation using the same
 * public pieces (fitScore, engine.displayStatus, engine.store) rather than a
 * new HTTP call to the old server. Keep this in sync with opportunityView()
 * if that shape changes.
 */
export function opportunityView(engine: RadarEngine, opp: Opportunity, userId?: string) {
  const user = userId ? engine.store.users.get(userId) : undefined;
  return {
    id: opp.id,
    title: opp.fields.title,
    organizationName: opp.fields.organizationName,
    type: opp.fields.type,
    genres: opp.fields.genres,
    status: engine.displayStatus(opp.id),
    deadline: opp.fields.deadline.date,
    deadlineKind: opp.fields.deadline.kind,
    fee: opp.fields.fee,
    submissionUrl: opp.fields.submissionUrl,
    trust: opp.scores.trust,
    fit: user ? fitScore(user, opp, new Date()) : undefined,
    tracked: userId ? engine.store.tracked.some((t) => t.userId === userId && t.opportunityId === opp.id) : false,
  };
}
