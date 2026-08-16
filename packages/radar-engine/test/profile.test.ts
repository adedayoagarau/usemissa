import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, FixtureFetcher, ProfilePrivacyValidationError, ProfileValidationError, PublicPortfolioValidationError, RadarEngine } from '../src/index.js';

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
  assert.deepEqual(publicProfile, { isPrivate: true });
});

test('privacy updates are strict, complete, and no-op safe', () => {
  const { engine, user } = engineWithUser();
  const first = engine.updateProfilePrivacy(user.id, { bio: 'private', trackedOpportunityCount: 'public' });
  assert.deepEqual(first.settings, { displayName: 'public', bio: 'private', trackedOpportunityCount: 'public' });
  assert.deepEqual(first.changedFields, ['bio', 'trackedOpportunityCount']);
  assert.deepEqual(engine.publicUserProfile(user.id), { id: user.id, displayName: 'Ada' });
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
