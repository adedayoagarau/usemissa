import test from "node:test";
import assert from "node:assert/strict";
import type { Source } from "@missa/radar-engine";
import { discoverSourceLinks } from "../src/sourceDiscoveryAdapters.js";

function source(overrides: Partial<Source> = {}): Source {
  return {
    id: "source-newpages",
    name: "NewPages Calls and Contests",
    url: "https://www.newpages.com/classifieds-fee/all/",
    kind: "directory",
    registryTier: 2,
    followsOutboundLinks: true,
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
    discoveryAdapterId: "newpages-index",
    ...overrides,
  };
}

test("NewPages discovery returns only call detail pages with source provenance", () => {
  const html = `
    <nav>
      <a href="/submission-opportunities/calls-for-submissions/">Calls for submissions</a>
      <a href="https://npofficespace.com/listing-request/">Submit a listing</a>
    </nav>
    <main>
      <a href="/guide-submission-opportunities/jeffrey-e-smith-editors-prize-2026/">
        Jeffrey E. Smith Editors' Prize
      </a>
      <a href="/guide-submission-opportunities/big-list-of-writing-contests/">
        Big list of writing contests
      </a>
      <a href="/blog/where-to-submit/">Where to submit</a>
    </main>
  `;

  assert.deepEqual(discoverSourceLinks(source(), html, source().url), [
    {
      url: "https://www.newpages.com/guide-submission-opportunities/jeffrey-e-smith-editors-prize-2026/",
      title: "Jeffrey E. Smith Editors' Prize",
      kind: "directory",
      registryTier: 2,
      followsOutboundLinks: true,
      discoveryAdapterId: "newpages-detail",
      discoveredFromSourceId: "source-newpages",
    },
  ]);
});

test("source discovery uses an accessible anchor label when a card has no text", () => {
  const html = `
    <a class="card" href="/guide-submission-opportunities/jeffrey-e-smith-editors-prize-2026/"
       aria-label="Now Open: Jeffrey E. Smith Editors&#8217; Prize">
      <img src="cover.webp" alt="" />
    </a>
  `;

  assert.equal(
    discoverSourceLinks(source(), html, source().url)[0]?.title,
    "Now Open: Jeffrey E. Smith Editors’ Prize",
  );
});

test("NewPages detail discovery resolves the official host and drops page furniture", () => {
  const detail = source({
    id: "newpages-detail",
    name: "Jeffrey E. Smith Editors' Prize",
    url: "https://www.newpages.com/guide-submission-opportunities/jeffrey-e-smith-editors-prize-2026/",
    discoveryAdapterId: "newpages-detail",
    discoveredFromSourceId: "source-newpages",
  });
  const html = `
    <header>
      <a href="https://npofficespace.com/listing-request/">Submit listing request</a>
      <a href="https://newpages.substack.com/subscribe">Subscribe</a>
    </header>
    <main>
      <p>Enter the Jeffrey E. Smith Editors' Prize by October 1.</p>
      <a href="https://missourireview.com/">The Missouri Review</a>
      <a href="https://missourireview.com/submissions/contests/jeffrey-e-smith-editors-prize/">
        www.missourireview.com/contests/jeffrey-e-smith-editors-prize/
      </a>
    </main>
    <footer>
      <a href="https://www.facebook.com/NewPages">Facebook</a>
    </footer>
  `;

  assert.deepEqual(discoverSourceLinks(detail, html, detail.url), [
    {
      url: "https://missourireview.com/submissions/contests/jeffrey-e-smith-editors-prize/",
      title: "Jeffrey E. Smith Editors' Prize",
      kind: "organization-website",
      registryTier: 0,
      followsOutboundLinks: false,
      discoveredFromSourceId: "newpages-detail",
    },
  ]);
});

test("Commonwealth discovery follows only opportunity detail pages", () => {
  const commonwealth = source({
    id: "source-commonwealth",
    name: "Commonwealth Foundation Creative Opportunities",
    url: "https://commonwealthfoundation.com/opportunities/",
    discoveryAdapterId: "commonwealth-index",
  });
  const html = `
    <a href="/grants-call-update/">Grants call information</a>
    <a href="/short-story-prize/">Short Story Prize</a>
    <a href="/opportunity/climate-playwriting-prize/">Climate Playwriting Prize</a>
    <a href="/opportunity/the-simple-script-writers-project/">The Simple Script Writers Project</a>
    <a href="/community/">Community opportunities</a>
  `;

  assert.deepEqual(discoverSourceLinks(commonwealth, html, commonwealth.url), [
    {
      url: "https://commonwealthfoundation.com/opportunity/climate-playwriting-prize/",
      title: "Climate Playwriting Prize",
      kind: "directory",
      registryTier: 2,
      followsOutboundLinks: true,
      discoveryAdapterId: "commonwealth-detail",
      discoveredFromSourceId: "source-commonwealth",
    },
    {
      url: "https://commonwealthfoundation.com/opportunity/the-simple-script-writers-project/",
      title: "The Simple Script Writers Project",
      kind: "directory",
      registryTier: 2,
      followsOutboundLinks: true,
      discoveryAdapterId: "commonwealth-detail",
      discoveredFromSourceId: "source-commonwealth",
    },
  ]);
});

test("Commonwealth detail discovery resolves the original host call", () => {
  const detail = source({
    id: "commonwealth-detail",
    name: "The Simple Script Writers Project",
    url: "https://commonwealthfoundation.com/opportunity/the-simple-script-writers-project/",
    discoveryAdapterId: "commonwealth-detail",
    discoveredFromSourceId: "source-commonwealth",
  });
  const html = `
    <main>
      <p>Applications close on 1 September 2026.</p>
      <a href="https://thesimplescriptproject.com/home/">
        Continue Reading
      </a>
    </main>
    <a href="https://twitter.com/commonwealthorg">Twitter</a>
  `;

  assert.deepEqual(discoverSourceLinks(detail, html, detail.url), [
    {
      url: "https://thesimplescriptproject.com/home/",
      title: "The Simple Script Writers Project",
      kind: "organization-website",
      registryTier: 0,
      followsOutboundLinks: false,
      discoveredFromSourceId: "commonwealth-detail",
    },
  ]);
});

test("detail discovery treats a linked archive as a discovery root, not a canonical call", () => {
  const detail = source({
    id: "headlight-detail",
    name: "The Headlight Review Seeks Mighty Micros",
    url: "https://www.newpages.com/guide-submission-opportunities/headlight-review-mighty-micros-call/",
    discoveryAdapterId: "newpages-detail",
  });
  const html = `
    <main>
      <p>Submissions are open for Mighty Micros.</p>
      <a href="https://www.theheadlightreview.com/issues/volume-3/mighty-micros">
        Read the first volume here
      </a>
    </main>
  `;

  assert.deepEqual(discoverSourceLinks(detail, html, detail.url), [
    {
      url: "https://www.theheadlightreview.com/",
      title: "The Headlight Review Seeks Mighty Micros",
      kind: "directory",
      registryTier: 1,
      followsOutboundLinks: true,
      discoveredFromSourceId: "headlight-detail",
    },
  ]);
});

test("detail discovery excludes community-chat destinations from canonical hosts", () => {
  const detail = source({
    id: "project-detail",
    name: "Project Infinity Writing Contest",
    url: "https://www.newpages.com/guide-submission-opportunities/project-infinity/",
    discoveryAdapterId: "newpages-detail",
  });
  const html = `
    <main>
      <a href="https://projectinfinitybp.org/">Official site</a>
      <a href="https://fluxer.gg/example">Community server</a>
    </main>
  `;

  assert.deepEqual(discoverSourceLinks(detail, html, detail.url).map((link) => link.url), [
    "https://projectinfinitybp.org/",
  ]);
});

test("Music In Africa discovery keeps open-call articles and excludes awards news", () => {
  const musicInAfrica = source({
    id: "source-music-in-africa",
    name: "Music In Africa Opportunities",
    url: "https://musicinafrica.net/tag/opportunities/",
    discoveryAdapterId: "music-in-africa-index",
  });
  const html = `
    <a href="/magazine/open-call-2027-sxsw-pitch-for-global-start-ups/">
      Open call: 2027 SXSW Pitch for global start-ups
    </a>
    <a href="/magazine/apply-now-sound-connects-fund/">Apply now for the Sound Connects Fund</a>
    <a href="/magazine/basadi-in-music-awards-2026-all-the-winners/">
      Basadi in Music Awards 2026: all the winners
    </a>
  `;

  assert.deepEqual(
    discoverSourceLinks(musicInAfrica, html, musicInAfrica.url),
    [
      {
        url: "https://musicinafrica.net/magazine/open-call-2027-sxsw-pitch-for-global-start-ups/",
        title: "Open call: 2027 SXSW Pitch for global start-ups",
        kind: "directory",
        registryTier: 2,
        followsOutboundLinks: true,
        discoveryAdapterId: "music-in-africa-detail",
        discoveredFromSourceId: "source-music-in-africa",
      },
      {
        url: "https://musicinafrica.net/magazine/apply-now-sound-connects-fund/",
        title: "Apply now for the Sound Connects Fund",
        kind: "directory",
        registryTier: 2,
        followsOutboundLinks: true,
        discoveryAdapterId: "music-in-africa-detail",
        discoveredFromSourceId: "source-music-in-africa",
      },
    ],
  );
});

test("Music In Africa homepage discovery follows its dedicated opportunities index", () => {
  const musicInAfrica = source({
    id: "source-music-in-africa",
    name: "Music In Africa Opportunities",
    url: "https://www.musicinafrica.net/",
    discoveryAdapterId: "music-in-africa-index",
  });
  const html = `<a href="/tag/opportunities/">Opportunities</a>`;

  assert.deepEqual(
    discoverSourceLinks(musicInAfrica, html, musicInAfrica.url),
    [
      {
        url: "https://www.musicinafrica.net/tag/opportunities/",
        title: "Opportunities",
        kind: "directory",
        registryTier: 2,
        followsOutboundLinks: true,
        discoveryAdapterId: "music-in-africa-index",
        discoveredFromSourceId: "source-music-in-africa",
      },
    ],
  );
});

test("Music In Africa detail discovery keeps the in-article application host", () => {
  const detail = source({
    id: "music-in-africa-detail",
    name: "Open call: 2027 SXSW Pitch for global start-ups",
    url: "https://musicinafrica.net/magazine/open-call-2027-sxsw-pitch-for-global-start-ups/",
    discoveryAdapterId: "music-in-africa-detail",
    discoveredFromSourceId: "source-music-in-africa",
  });
  const html = `
    <main>
      <p>SXSW Pitch is an open-call competition.</p>
      <p>Apply <a href="https://cart.sxsw.com/acceleratorapps/84235/edit">here</a>.</p>
      <a href="https://wa.me/?text=share">Share on WhatsApp</a>
    </main>
    <footer>
      <a href="https://www.siege.ai/">Site developer</a>
      <a href="https://www.facebook.com/MusicInAfrica">Facebook</a>
    </footer>
  `;

  assert.deepEqual(discoverSourceLinks(detail, html, detail.url), [
    {
      url: "https://cart.sxsw.com/acceleratorapps/84235/edit",
      title: "Open call: 2027 SXSW Pitch for global start-ups",
      kind: "organization-website",
      registryTier: 0,
      followsOutboundLinks: false,
      discoveredFromSourceId: "music-in-africa-detail",
    },
  ]);
});

test("African Culture Fund discovery keeps live call pages and excludes results", () => {
  const acf = source({
    id: "source-african-culture-fund",
    name: "African Culture Fund Calls",
    url: "https://www.africanculturefund.net/en/",
    discoveryAdapterId: "african-culture-fund-index",
  });
  const html = `
    <a href="/en/results-of-call-for-proposals-17-sofaco-lot-6/">
      Results of Call for Proposals 17
    </a>
    <a href="/en/call-for-applications-boot-camp-6-algiers/">
      Call for applications, BOOT CAMP 6 | Algiers
    </a>
    <a href="/en/results-of-the-call-for-applications-boot-camp-6-cultural-management-algeria/">
      Results of the call for applications
    </a>
  `;

  assert.deepEqual(discoverSourceLinks(acf, html, acf.url), [
    {
      url: "https://www.africanculturefund.net/en/call-for-applications-boot-camp-6-algiers/",
      title: "Call for applications, BOOT CAMP 6 | Algiers",
      kind: "organization-website",
      registryTier: 0,
      followsOutboundLinks: false,
      discoveredFromSourceId: "source-african-culture-fund",
    },
  ]);
});

test("TransArtists discovery follows current call articles and resolves official hosts", () => {
  const index: Source = {
    id: "transartists", name: "TransArtists Open Calls", url: "https://www.transartists.org/en/transartists-calls",
    kind: "directory", active: true, checkIntervalHours: 24, consecutiveFailures: 0,
    discoveryAdapterId: "transartists-index",
  };
  const detail = discoverSourceLinks(index, `
    <main>
      <a href="/en/news/hong-kong-baptist-university-international-writers-workshop-2027">Hong Kong Baptist University: International Writers' Workshop 2027</a>
      <a href="/en/transartists-database">About the database</a>
    </main>
  `, index.url);
  assert.equal(detail.length, 1);
  assert.equal(detail[0]?.discoveryAdapterId, "transartists-detail");
  assert.equal(detail[0]?.registryTier, 2);

  const official = discoverSourceLinks({ ...index, ...detail[0], id: "detail" }, `
    <main><article>
      <h1>Hong Kong Baptist University: International Writers' Workshop 2027</h1>
      <a href="https://iww.hkbu.edu.hk/apply">Apply on the official programme website</a>
    </article></main>
  `, detail[0]!.url);
  assert.equal(official.length, 1);
  assert.equal(official[0]?.url, "https://iww.hkbu.edu.hk/apply");
  assert.equal(official[0]?.registryTier, 0);
});
