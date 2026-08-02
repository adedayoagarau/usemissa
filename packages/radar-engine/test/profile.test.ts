import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, FixtureFetcher, ProfileValidationError, RadarEngine } from '../src/index.js';

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
