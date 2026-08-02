import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, FixtureFetcher, ProfilePrivacyValidationError, ProfileValidationError, RadarEngine } from '../src/index.js';

function engineWithUser() {
  const engine = new RadarEngine({ store: createStore(), fetcher: new FixtureFetcher() });
  const user = engine.addUser({ id: 'user_profile', displayName: '  Ada  ', bio: '  A writer.  ', genres: ['poetry'], attributes: { location: 'private' } });
  return { engine, user };
}

test('profile updates trim public fields and derive completeness', () => {
  const { engine, user } = engineWithUser();
  const saved = engine.updateUserProfile(user.id, { displayName: '  Ada Lovelace  ', bio: '  Writer and researcher.  ' });
  assert.equal(saved.displayName, 'Ada Lovelace');
  assert.equal(saved.bio, 'Writer and researcher.');
  assert.deepEqual(engine.profileCompleteness(user.id), { complete: true, missing: [] });
});

test('profile update rejects blank or over-limit values without partial mutation', () => {
  const { engine, user } = engineWithUser();
  assert.throws(() => engine.updateUserProfile(user.id, { displayName: '   ' }), (error: unknown) => error instanceof ProfileValidationError && error.field === 'displayName');
  assert.equal(user.displayName, '  Ada  ');
  assert.throws(() => engine.updateUserProfile(user.id, { bio: 'x'.repeat(1001) }), (error: unknown) => error instanceof ProfileValidationError && error.field === 'bio');
  assert.equal(user.bio, '  A writer.  ');
  assert.throws(() => engine.updateUserProfile(user.id, { displayName: 'x'.repeat(121) }), (error: unknown) => error instanceof ProfileValidationError && error.field === 'displayName');
});

test('public profile projection excludes matching and account data and supports missing users', () => {
  const { engine, user } = engineWithUser();
  const profile = engine.publicUserProfile(user.id);
  assert.deepEqual(profile, { id: user.id, displayName: 'Ada', bio: 'A writer.' });
  assert.equal(Object.prototype.hasOwnProperty.call(profile, 'attributes'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(profile, 'genres'), false);
  assert.equal(engine.publicUserProfile('unknown'), undefined);
});

test('privacy defaults fail closed and public projection only includes opted-in fields', () => {
  const { engine, user } = engineWithUser();
  assert.deepEqual(engine.profilePrivacy(user.id), { displayName: 'public', bio: 'public', trackedOpportunityCount: 'private' });
  user.privacy = { displayName: 'unexpected' as never, bio: 'unexpected' as never, trackedOpportunityCount: 'public' };
  const publicProfile = engine.publicUserProfile(user.id);
  assert.deepEqual(publicProfile, { id: user.id, trackedOpportunityCount: 0 });
});

test('privacy updates are strict, complete, and no-op safe', () => {
  const { engine, user } = engineWithUser();
  const first = engine.updateProfilePrivacy(user.id, { bio: 'private', trackedOpportunityCount: 'public' });
  assert.deepEqual(first.settings, { displayName: 'public', bio: 'private', trackedOpportunityCount: 'public' });
  assert.deepEqual(first.changedFields, ['bio', 'trackedOpportunityCount']);
  assert.deepEqual(engine.publicUserProfile(user.id), { id: user.id, displayName: 'Ada', trackedOpportunityCount: 0 });
  const noOp = engine.updateProfilePrivacy(user.id, { bio: 'private' });
  assert.deepEqual(noOp.changedFields, []);
  assert.throws(() => engine.updateProfilePrivacy(user.id, { bio: 'hidden' as never }), ProfilePrivacyValidationError);
  assert.throws(() => engine.updateProfilePrivacy(user.id, { future: 'public' } as never), ProfilePrivacyValidationError);
  assert.equal(user.privacy?.bio, 'private');
});

test('public tracked count is recomputed from tracked rows and private identity can result in no projection', () => {
  const { engine, user } = engineWithUser();
  user.privacy = { displayName: 'private', bio: 'private', trackedOpportunityCount: 'private' };
  assert.deepEqual(engine.publicUserProfile(user.id), { isPrivate: true });
  user.privacy = { displayName: 'private', bio: 'private', trackedOpportunityCount: 'public' };
  engine.store.tracked.push({ userId: user.id, opportunityId: 'opp-a', trackedAt: 'now', notify: true, myStatus: 'saved', events: [] });
  assert.deepEqual(engine.publicUserProfile(user.id), { id: user.id, trackedOpportunityCount: 1 });
});
