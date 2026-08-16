import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, FixtureFetcher, isPublicProfileIndexable, profileSampleKindForWork, ProfilePrivacyValidationError, ProfileValidationError, PublicPortfolioValidationError, RadarEngine } from '../src/index.js';

function engineWithUser() {
  const engine = new RadarEngine({ store: createStore(), fetcher: new FixtureFetcher() });
  const user = engine.addUser({ id: 'user_profile', displayName: '  Ada  ', bio: '  A writer.  ', genres: ['poetry'], attributes: { location: 'private' } });
  return { engine, user };
}

test('profile updates trim public fields and derive completeness', () => {
  const { engine, user } = engineWithUser();
  const saved = engine.updateUserProfile(user.id, {
    displayName: '  Ada Lovelace  ',
    bio: '  Writer and researcher.  ',
    opportunityPreferences: { types: ['magazine'], locations: ['Nigeria'], careerStages: ['emerging'], noFeeOnly: true, deadlineWithinDays: 30, simultaneousRequired: false },
  });
  assert.equal(saved.displayName, 'Ada Lovelace');
  assert.equal(saved.bio, 'Writer and researcher.');
  assert.deepEqual(engine.profileCompleteness(user.id), { complete: true, missing: [] });
});

test('profile completeness calls out unconfigured opportunity preferences', () => {
  const { engine, user } = engineWithUser();
  assert.deepEqual(engine.profileCompleteness(user.id), { complete: false, missing: ['opportunityPreferences'] });
});

test('opportunity preferences are normalized and validated', () => {
  const { engine, user } = engineWithUser();
  const saved = engine.updateUserProfile(user.id, { opportunityPreferences: { types: [' magazine ', 'magazine'], maxFeeCents: 500, noFeeOnly: false, deadlineWithinDays: 90, simultaneousRequired: true } });
  assert.deepEqual(saved.opportunityPreferences, {
    types: ['magazine'], disciplines: [], genres: [], locations: [], careerStages: [], maxFeeCents: 500,
    noFeeOnly: false, deadlineWithinDays: 90, simultaneousRequired: true,
  });
  assert.throws(() => engine.updateUserProfile(user.id, { opportunityPreferences: { types: ['workshop'] } }), (error: unknown) => error instanceof ProfileValidationError && error.field === 'opportunityPreferences');
});

test('profile taxonomy preferences are private, canonical-id based, and validated', () => {
  const { engine, user } = engineWithUser();
  engine.updateUserProfile(user.id, { taxonomyPreferences: [{ termId: 'term_poetry', preference: 'include', weight: 100 }] });
  assert.deepEqual(user.taxonomyPreferences, [{ termId: 'term_poetry', preference: 'include', weight: 100 }]);
  assert.equal(Object.prototype.hasOwnProperty.call(engine.publicUserProfile(user.id), 'taxonomyPreferences'), false);
  assert.throws(() => engine.updateUserProfile(user.id, { taxonomyPreferences: [{ termId: 'term_poetry', preference: 'include', weight: 101 }] }), (error: unknown) => error instanceof ProfileValidationError && error.field === 'taxonomyPreferences');
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
  assert.deepEqual(profile, { isPrivate: true });
  assert.equal(Object.prototype.hasOwnProperty.call(profile, 'attributes'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(profile, 'genres'), false);
  assert.equal(engine.publicUserProfile('unknown'), undefined);
});

test('privacy defaults fail closed and public projection only includes opted-in fields', () => {
  const { engine, user } = engineWithUser();
  assert.deepEqual(engine.profilePrivacy(user.id), { displayName: 'public', bio: 'public', trackedOpportunityCount: 'private' });
  user.privacy = { displayName: 'unexpected' as never, bio: 'unexpected' as never, trackedOpportunityCount: 'public' };
  const publicProfile = engine.publicUserProfile(user.id);
  assert.deepEqual(publicProfile, { isPrivate: true });
});

test('privacy updates are strict, complete, and no-op safe', () => {
  const { engine, user } = engineWithUser();
  const first = engine.updateProfilePrivacy(user.id, { bio: 'private', trackedOpportunityCount: 'public' });
  assert.deepEqual(first.settings, { displayName: 'public', bio: 'private', trackedOpportunityCount: 'public' });
  assert.deepEqual(first.changedFields, ['bio', 'trackedOpportunityCount']);
  assert.deepEqual(engine.publicUserProfile(user.id), { isPrivate: true });
  const noOp = engine.updateProfilePrivacy(user.id, { bio: 'private' });
  assert.deepEqual(noOp.changedFields, []);
  assert.throws(() => engine.updateProfilePrivacy(user.id, { bio: 'hidden' as never }), ProfilePrivacyValidationError);
  assert.throws(() => engine.updateProfilePrivacy(user.id, { future: 'public' } as never), ProfilePrivacyValidationError);
  assert.equal(user.privacy?.bio, 'private');
});

test('legacy tracked-count visibility never exposes private Tracker activity', () => {
  const { engine, user } = engineWithUser();
  user.privacy = { displayName: 'private', bio: 'private', trackedOpportunityCount: 'private' };
  assert.deepEqual(engine.publicUserProfile(user.id), { isPrivate: true });
  user.privacy = { displayName: 'private', bio: 'private', trackedOpportunityCount: 'public' };
  engine.store.tracked.push({ userId: user.id, opportunityId: 'opp-a', trackedAt: 'now', notify: true, myStatus: 'saved', events: [] });
  assert.deepEqual(engine.publicUserProfile(user.id), { isPrivate: true });
});

test('publishing a portfolio exposes only creator-authored public fields', () => {
  const { engine, user } = engineWithUser();
  const published = engine.publishUserPortfolio(user.id, {
    displayName: '  Ada Okafor  ',
    bio: '  Essays and fiction.  ',
    profileImageUrl: 'https://images.example.com/ada.jpg',
    headline: '  Writer · Lagos  ',
    oneLine: '  Writing about home, work, and memory.  ',
    openTo: '  Essays and commissions.  ',
    contactEnabled: true,
    socialLinks: [
      { id: 'website', service: 'website', url: 'https://ada.example.com' },
      { id: 'instagram', service: 'instagram', url: 'https://www.instagram.com/ada/' },
    ],
    selectedWorks: [
      {
        id: 'harmattan-year',
        title: '  The Harmattan Year  ',
        publication: '  Granta  ',
        year: 2026,
        url: 'https://example.com/harmattan-year',
        description: '  An essay about dust and inheritance.  ',
      },
    ],
  });

  assert.equal(published.displayName, 'Ada Okafor');
  assert.equal(typeof published.publicProfilePublishedAt, 'string');
  assert.deepEqual(engine.publicUserProfile(user.id), {
    id: user.id,
    displayName: 'Ada Okafor',
    bio: 'Essays and fiction.',
    profileImageUrl: 'https://images.example.com/ada.jpg',
    headline: 'Writer · Lagos',
    oneLine: 'Writing about home, work, and memory.',
    openTo: 'Essays and commissions.',
    contactEnabled: true,
    socialLinks: [
      { id: 'website', service: 'website', url: 'https://ada.example.com/' },
      { id: 'instagram', service: 'instagram', url: 'https://www.instagram.com/ada/' },
    ],
    selectedWorks: [
      {
        id: 'harmattan-year',
        title: 'The Harmattan Year',
        publication: 'Granta',
        year: 2026,
        url: 'https://example.com/harmattan-year',
        description: 'An essay about dust and inheritance.',
      },
    ],
    publishedAt: published.publicProfilePublishedAt,
  });
  assert.equal(Object.prototype.hasOwnProperty.call(engine.publicUserProfile(user.id), 'attributes'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(engine.publicUserProfile(user.id), 'opportunityPreferences'), false);
});

test('public portfolio validation rejects mismatched and unsafe links without mutation', () => {
  const { engine, user } = engineWithUser();
  assert.throws(
    () => engine.publishUserPortfolio(user.id, {
      displayName: 'Ada',
      socialLinks: [{ id: 'instagram', service: 'instagram', url: 'https://youtube.com/@ada' }],
      selectedWorks: [],
    }),
    (error: unknown) => error instanceof PublicPortfolioValidationError && error.field === 'socialLinks',
  );
  assert.equal(user.publicPortfolio, undefined);
  assert.throws(
    () => engine.publishUserPortfolio(user.id, {
      displayName: 'Ada',
      profileImageUrl: 'javascript:alert(1)',
      socialLinks: [],
      selectedWorks: [],
    }),
    PublicPortfolioValidationError,
  );
  assert.equal(user.publicProfilePublishedAt, undefined);
  assert.throws(
    () => engine.publishUserPortfolio(user.id, {
      displayName: 'Ada',
      contactEnabled: 'yes' as never,
      socialLinks: [],
      selectedWorks: [],
    }),
    (error: unknown) => error instanceof PublicPortfolioValidationError && error.field === 'contactEnabled',
  );
});

test('public portfolio keeps social links and selected Works bounded and stable', () => {
  const { engine, user } = engineWithUser();
  assert.throws(
    () => engine.publishUserPortfolio(user.id, {
      displayName: 'Ada',
      socialLinks: Array.from({ length: 13 }, (_, index) => ({
        id: `link-${index}`,
        service: 'other' as const,
        url: `https://example.com/${index}`,
      })),
      selectedWorks: [],
    }),
    PublicPortfolioValidationError,
  );
  assert.throws(
    () => engine.publishUserPortfolio(user.id, {
      displayName: 'Ada',
      socialLinks: [],
      selectedWorks: [
        { id: 'same', title: 'First' },
        { id: 'same', title: 'Second' },
      ],
    }),
    PublicPortfolioValidationError,
  );
});

test('publishing a Library Work stores its stable identity and a public snapshot', () => {
  const { engine, user } = engineWithUser();
  const work = engine.createLibraryWork(user.id, { title: '  The Harmattan Year  ', description: '  A private Library description.  ' });
  engine.publishUserPortfolio(user.id, {
    displayName: 'Ada', socialLinks: [],
    selectedWorks: [{ id: 'featured-work', workId: work.id, title: 'Untrusted client title', publication: 'Granta', year: 2026 }],
  });
  assert.deepEqual(engine.publicUserProfile(user.id)?.selectedWorks, [{ id: 'featured-work', workId: work.id, title: 'The Harmattan Year', description: 'A private Library description.', publication: 'Granta', year: 2026 }]);
  engine.updateLibraryWork(user.id, work.id, { title: 'The Harmattan Year — revised privately' });
  assert.equal(engine.publicUserProfile(user.id)?.selectedWorks?.[0]?.title, 'The Harmattan Year');
});

test('publishing rejects a missing or another creator\'s Library Work atomically', () => {
  const { engine, user } = engineWithUser();
  engine.addUser({ id: 'user_other', displayName: 'Other creator', attributes: {}, genres: [] });
  const otherWork = engine.createLibraryWork('user_other', { title: 'Not Ada\'s Work' });
  for (const workId of ['library_work_missing', otherWork.id]) {
    assert.throws(() => engine.publishUserPortfolio(user.id, { displayName: 'Ada', socialLinks: [], selectedWorks: [{ id: 'featured-work', workId, title: 'Untrusted title' }] }), (error: unknown) => error instanceof PublicPortfolioValidationError && error.field === 'selectedWorks');
    assert.equal(user.publicPortfolio, undefined);
    assert.equal(user.publicProfilePublishedAt, undefined);
  }
});

test('sample kind resolves from the primary Medium and falls back to file type', () => {
  const { engine, user } = engineWithUser();
  const imageFile = engine.createLibraryFile(user.id, { filename: 'page.jpg', contentType: 'image/jpeg', byteLength: 100, storageKey: 'private/page.jpg' });
  const writtenWork = engine.createLibraryWork(user.id, { title: 'A passage', fileId: imageFile.id, taxonomyTermIds: ['taxterm_medium-text'] });
  const imageWork = engine.createLibraryWork(user.id, { title: 'A photograph', fileId: imageFile.id });
  assert.equal(profileSampleKindForWork(writtenWork, imageFile), 'text');
  assert.equal(profileSampleKindForWork(imageWork, imageFile), 'image');
});

test('a published passage keeps its resolved kind when Library taxonomy changes', () => {
  const { engine, user } = engineWithUser();
  const work = engine.createLibraryWork(user.id, { title: 'The Harmattan Year', taxonomyTermIds: ['taxterm_medium-text'] });
  const rightsConfirmedAt = '2026-08-16T12:00:00.000Z';
  engine.publishUserPortfolio(user.id, { displayName: 'Ada', socialLinks: [], selectedWorks: [{ id: 'featured-work', workId: work.id, title: work.title, sample: { kind: 'image', excerpt: 'The dust came early that year.', rightsConfirmedAt } }] });
  assert.deepEqual(engine.publicUserProfile(user.id)?.selectedWorks?.[0]?.sample, { kind: 'text', excerpt: 'The dust came early that year.', rightsConfirmedAt });
  engine.updateLibraryWork(user.id, work.id, { taxonomyTermIds: ['taxterm_medium-audio'] });
  assert.equal(engine.publicUserProfile(user.id)?.selectedWorks?.[0]?.sample?.kind, 'text');
});

test('media samples require a public asset and accessible public description', () => {
  const { engine, user } = engineWithUser();
  const file = engine.createLibraryFile(user.id, { filename: 'room.jpg', contentType: 'image/jpeg', byteLength: 100, storageKey: 'private/room.jpg' });
  const work = engine.createLibraryWork(user.id, { title: 'Room with the Generator Off', fileId: file.id });
  assert.throws(() => engine.publishUserPortfolio(user.id, { displayName: 'Ada', socialLinks: [], selectedWorks: [{ id: 'featured-work', workId: work.id, title: work.title, sample: { kind: 'image', publicAssetUrl: 'https://assets.example.com/room.jpg', rightsConfirmedAt: '2026-08-16T12:00:00.000Z' } }] }), (error: unknown) => error instanceof PublicPortfolioValidationError && error.field === 'selectedWorks');
});

test('unpublishing closes the public projection and removes public asset references', () => {
  const { engine, user } = engineWithUser();
  engine.publishUserPortfolio(user.id, {
    displayName: 'Ada', profileImageUrl: 'https://images.example.com/ada.jpg', socialLinks: [],
    selectedWorks: [{ id: 'featured-work', title: 'A passage', sample: { kind: 'text', excerpt: 'A public passage.', rightsConfirmedAt: '2026-08-16T12:00:00.000Z' } }],
  });
  const saved = engine.unpublishUserPortfolio(user.id);
  assert.equal(saved.publicProfilePublishedAt, undefined);
  assert.equal(saved.publicPortfolio?.profileImageUrl, undefined);
  assert.equal(saved.publicPortfolio?.selectedWorks[0]?.sample, undefined);
  assert.equal(saved.publicPortfolio?.selectedWorks[0]?.title, 'A passage');
  assert.deepEqual(engine.publicUserProfile(user.id), { isPrivate: true });
});

test('search indexability requires a one-line introduction and meaningful Work', () => {
  assert.equal(isPublicProfileIndexable({ displayName: 'Ada', oneLine: 'Writes essays.', selectedWorks: [{ id: 'one', title: 'One credit' }] }), false);
  assert.equal(isPublicProfileIndexable({ displayName: 'Ada', oneLine: 'Writes essays.', selectedWorks: [{ id: 'one', title: 'One' }, { id: 'two', title: 'Two' }] }), true);
  assert.equal(isPublicProfileIndexable({ displayName: 'Ada', oneLine: 'Writes essays.', selectedWorks: [{ id: 'one', title: 'One', sample: { kind: 'text', excerpt: 'A passage.', rightsConfirmedAt: '2026-08-16T12:00:00.000Z' } }] }), true);
  assert.equal(isPublicProfileIndexable({ isPrivate: true }), false);
});
