import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStore, FixtureFetcher, LibraryValidationError, RadarEngine } from '../src/index.js';

function engineFor(userId = 'user_1') {
  const store = createStore();
  store.users.set(userId, { id: userId, displayName: 'Creator', attributes: {}, genres: [] });
  return new RadarEngine({ store, fetcher: new FixtureFetcher() });
}

test('Library CRUD is owner-scoped and separates Works from Saved Answers', () => {
  const engine = engineFor();
  const work = engine.createLibraryWork('user_1', { title: 'Night River', description: 'Poetry manuscript' });
  const answer = engine.createSavedAnswer('user_1', { name: 'Short bio', body: 'A writer working across poetry and criticism.' });
  assert.equal(engine.library('user_1').works[0]?.title, 'Night River');
  assert.equal(engine.library('user_1').savedAnswers[0]?.name, 'Short bio');
  assert.deepEqual(engine.library('user_2'), { works: [], files: [], savedAnswers: [] });
  engine.updateLibraryWork('user_1', work.id, { title: 'Night River — revised' });
  engine.updateSavedAnswer('user_1', answer.id, { body: 'Updated bio.' });
  assert.equal(engine.library('user_1').works[0]?.title, 'Night River — revised');
  assert.equal(engine.library('user_1').savedAnswers[0]?.body, 'Updated bio.');
  engine.deleteLibraryWork('user_1', work.id);
  engine.deleteSavedAnswer('user_1', answer.id);
  assert.deepEqual(engine.library('user_1'), { works: [], files: [], savedAnswers: [] });
});

test('Library validation rejects oversized content and cross-user access', () => {
  const engine = engineFor();
  const work = engine.createLibraryWork('user_1', { title: 'A Work' });
  assert.throws(() => engine.createSavedAnswer('user_1', { name: 'Bio', body: '' }), LibraryValidationError);
  assert.throws(() => engine.updateLibraryWork('user_2', work.id, { title: 'Nope' }), /Work not found/);
  assert.throws(() => engine.createLibraryWork('user_1', { title: 'x'.repeat(201) }), /Title/);
});

test('Library Works retain canonical taxonomy terms for explainable matching', () => {
  const engine = engineFor();
  const work = engine.createLibraryWork('user_1', {
    title: 'Night River',
    taxonomyTermIds: ['taxterm_disc-poetry'],
  });
  assert.deepEqual(work.taxonomyAssignments, [{ termId: 'taxterm_disc-poetry', primary: true, assignmentOrigin: 'user' }]);
  engine.updateLibraryWork('user_1', work.id, { taxonomyTermIds: [] });
  assert.equal(engine.library('user_1').works[0]?.taxonomyAssignments, undefined);
  assert.throws(() => engine.createLibraryWork('user_1', { title: 'Unknown', taxonomyTermIds: ['not-a-canonical-term'] }), /Unknown Work taxonomy term/);
});

test('Library deletion blocks silent orphan references', () => {
  const engine = engineFor();
  const file = engine.createLibraryFile('user_1', { filename: 'river.pdf', contentType: 'application/pdf', byteLength: 128, storageKey: 'user_1/river.pdf' });
  const work = engine.createLibraryWork('user_1', { title: 'Night River', fileId: file.id });
  assert.throws(() => engine.deleteLibraryFile('user_1', file.id), /still linked to 1 Work/);
  assert.equal(engine.library('user_1').files.length, 1);
  engine.updateLibraryWork('user_1', work.id, { fileId: null });
  engine.deleteLibraryFile('user_1', file.id);
  assert.equal(engine.library('user_1').files.length, 0);
  assert.equal(engine.library('user_1').works.find((item) => item.id === work.id)?.fileId, undefined);
});

test('Library deletion requires a public Profile Work to be unpublished first', () => {
  const engine = engineFor();
  const work = engine.createLibraryWork('user_1', { title: 'Night River' });
  engine.publishUserPortfolio('user_1', { displayName: 'Creator', socialLinks: [], selectedWorks: [{ id: 'profile-work', workId: work.id, title: work.title }] });
  assert.throws(() => engine.deleteLibraryWork('user_1', work.id), /still linked to 1 public Profile Work/);
  engine.publishUserPortfolio('user_1', { displayName: 'Creator', socialLinks: [], selectedWorks: [] });
  engine.deleteLibraryWork('user_1', work.id);
  assert.equal(engine.library('user_1').works.length, 0);
  assert.equal(engine.store.users.get('user_1')?.publicPortfolio?.selectedWorks[0]?.workId, undefined);
});
