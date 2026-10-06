import assert from 'node:assert/strict';
import test from 'node:test';
import { identityImageJsonLd } from './seo';

test("an organizer's share image carries its credit in structured data", () => {
  assert.deepEqual(
    identityImageJsonLd({
      identityAssetUrl: 'https://blob.example/missa/opportunity-media/abc.jpg',
      identityAssetAlt: 'Fellows reading on stage',
      identityAssetCredit: 'Image: Cave Canem',
      organizationName: 'Cave Canem',
      organizationWebsiteUrl: 'https://cavecanem.example',
    }),
    {
      '@type': 'ImageObject',
      contentUrl: 'https://blob.example/missa/opportunity-media/abc.jpg',
      caption: 'Fellows reading on stage',
      creditText: 'Cave Canem',
      creator: { '@type': 'Organization', name: 'Cave Canem', url: 'https://cavecanem.example' },
    },
  );
});

test('a reviewed image without a credit has no creditText', () => {
  assert.deepEqual(identityImageJsonLd({ identityAssetUrl: 'https://org.example/a.jpg' }), {
    '@type': 'ImageObject',
    contentUrl: 'https://org.example/a.jpg',
  });
});
