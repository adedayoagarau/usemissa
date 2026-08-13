import test from "node:test";
import assert from "node:assert/strict";
import type { Source } from "@missa/radar-engine";
import {
  canonicalPageMatchesDirectoryCall,
  discoverSourceLinks,
} from "../src/sourceDiscoveryAdapters.js";

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

test("ArtConnect discovery follows opportunity cards and preserves separate calls", () => {
  const artConnect = source({
    id: "source-artconnect",
    name: "ArtConnect Opportunities",
    url: "https://www.artconnect.com/opportunities?fees=FREE&sortBy=-deadline",
    discoveryAdapterId: "artconnect-index",
  });
  const html = `
    <a href="/opportunity/one">First residency</a>
    <a href="/opportunity/two">Second grant</a>
    <a href="/opportunities?fees=FREE&amp;sortBy=-deadline&amp;page=2">Next</a>
    <a href="/opportunities/new">Add opportunity</a>
  `;

  assert.deepEqual(
    discoverSourceLinks(artConnect, html, artConnect.url).map((link) => ({
      url: link.url,
      adapter: link.discoveryAdapterId,
      from: link.discoveredFromSourceId,
    })),
    [
      { url: "https://www.artconnect.com/opportunity/one", adapter: "artconnect-detail", from: "source-artconnect" },
      { url: "https://www.artconnect.com/opportunity/two", adapter: "artconnect-detail", from: "source-artconnect" },
      { url: "https://www.artconnect.com/opportunities?fees=FREE&sortBy=-deadline&page=2", adapter: "artconnect-index", from: "source-artconnect" },
    ],
  );
});

test("ArtConnect discovery advances past a self-referencing paginator", () => {
  const artConnect = source({
    id: "source-artconnect-page-2",
    name: "ArtConnect Opportunities",
    url: "https://www.artconnect.com/opportunities?fees=FREE&sortBy=-deadline&page=2",
    discoveryAdapterId: "artconnect-index",
  });
  const links = discoverSourceLinks(
    artConnect,
    '<a href="/opportunity/three">Third call</a><a rel="next" href="/opportunities?fees=FREE&amp;sortBy=-deadline&amp;page=2">Next</a>',
    artConnect.url,
  );
  assert.ok(links.some((link) => link.url.endsWith("page=3") && link.discoveryAdapterId === "artconnect-index"));
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
      <a href="https://docs.google.com/forms/d/example/viewform">Apply now</a>
      <a href="https://sponsor.example/">Presented with Sponsor</a>
      <a href="https://iww.hkbu.edu.hk/apply">Apply on the official programme website</a>
    </article></main>
  `, detail[0]!.url);
  assert.equal(official.length, 1);
  assert.equal(official[0]?.url, "https://iww.hkbu.edu.hk/apply");
  assert.equal(official[0]?.registryTier, 0);
});

test("TransArtists keeps one organizer call page ahead of forms, attachments, and sponsors", () => {
  const detail = source({
    id: "transartists-detail",
    name: "Skopje Dance Theater New Production",
    url: "https://www.transartists.org/en/news/skopje-dance-theater-new-production",
    discoveryAdapterId: "transartists-detail",
  });
  const official = discoverSourceLinks(detail, `
    <main><article>
      <a href="https://sponsor.example/">Sponsor</a>
      <a href="https://ec.europa.eu/guidance/programme.pdf">Funding guidance</a>
      <a href="https://docs.google.com/forms/d/e/example/viewform">Apply now</a>
      <a href="https://interart.example/open-call/dance-residency-2027/">Official open call</a>
    </article></main>
  `, detail.url);

  assert.deepEqual(official.map((link) => link.url), [
    "https://interart.example/open-call/dance-residency-2027/",
  ]);
});

test("Res Artis discovery keeps only open-call detail pages and preserves its request profile", () => {
  const resArtis = source({
    id: "source-resartis",
    name: "Res Artis Open Calls",
    url: "https://resartis.org/open-calls/",
    discoveryAdapterId: "resartis-index",
    discoveryRequestProfile: "browser-compatible",
  });
  const html = `
    <nav><a href="/open-calls/">Open Calls</a><a href="/listings/">Residencies</a></nav>
    <main>
      <a href="/open-call/musical-theatre-dancers-intensive-2027/"><img src="call.jpg" alt="" /></a>
      <a href="/open-call/musical-theatre-dancers-intensive-2027/">Musical Theatre Dancers Intensive 2027</a>
      <a href="https://resartis.org/open-call/audio-recording-engineer-indigenous-music-2027/">Audio Recording Engineer</a>
      <a href="https://example.org/open-call/not-a-res-artis-page/">External navigation</a>
    </main>
  `;

  const links = discoverSourceLinks(resArtis, html, resArtis.url);
  assert.deepEqual(links.map((link) => link.url), [
    "https://resartis.org/open-call/musical-theatre-dancers-intensive-2027/",
    "https://resartis.org/open-call/audio-recording-engineer-indigenous-music-2027/",
  ]);
  assert.ok(links.every((link) => link.discoveryAdapterId === "resartis-detail"));
  assert.ok(links.every((link) => link.discoveryRequestProfile === "browser-compatible"));
  assert.equal(links[0]?.title, "Musical Theatre Dancers Intensive 2027");
});

test("Res Artis detail discovery proposes one official-host candidate for verification", () => {
  const detail = source({
    id: "resartis-detail",
    name: "Musical Theatre Dancers Intensive 2027",
    url: "https://resartis.org/open-call/musical-theatre-dancers-intensive-2027/",
    discoveryAdapterId: "resartis-detail",
    discoveryRequestProfile: "browser-compatible",
  });
  const html = `
    <main>
      <p>Applications close in 2027.</p>
      <a href="https://www.banffcentre.ca/node/6970">Banff Centre campus</a>
      <a href="https://www.banffcentre.ca/programs/musical-theatre-dancers-intensive-2027">Musical Theatre Dancers Intensive 2027</a>
      <a href="http://url.banffcentre.ca/bgmg6Y">Apply Online</a>
    </main>
    <footer><a href="https://www.facebook.com/resartis">Facebook</a></footer>
  `;

  assert.deepEqual(discoverSourceLinks(detail, html, detail.url), [
    {
      url: "https://www.banffcentre.ca/node/6970",
      title: "Musical Theatre Dancers Intensive 2027",
      kind: "organization-website",
      registryTier: 0,
      followsOutboundLinks: false,
      discoveredFromSourceId: "resartis-detail",
    },
  ]);
});

test("canonical host verification rejects related pages without call evidence", () => {
  const detail = source({
    id: "resartis-related-pages",
    name: "Fall 2027 Artist Residency in Morocco with Green Olive Arts",
    url: "https://resartis.org/open-call/fall-2027-artist-residency-in-morocco/",
    discoveryAdapterId: "resartis-detail",
  });
  assert.equal(canonicalPageMatchesDirectoryCall(
    detail.name,
    `<main><p>Applications close in 2027.</p></main>`,
    `<main><h1>Housing options</h1><p>Accommodation and studio amenities for artists.</p></main>`,
    "https://greenolivearts.example/art-residency/housing-options/",
  ), false);
});

test("canonical host verification accepts a matching official call page", () => {
  const detail = source({
    id: "resartis-title-match",
    name: "Group Residency, Orkney Islands: Wandering Rocks",
    url: "https://resartis.org/open-call/group-residency-orkney-islands/",
    discoveryAdapterId: "resartis-detail",
  });
  assert.equal(canonicalPageMatchesDirectoryCall(
    detail.name,
    `<main><p>Applications close in 2027.</p></main>`,
    `<main><h1>Group Residency Programme Orkney</h1><p>Open call. Apply by 1 March 2027.</p></main>`,
    "https://organizer.example/programmes/group-residency-orkney/",
  ), true);
});

test("canonical host verification rejects a conflicting call year", () => {
  assert.equal(canonicalPageMatchesDirectoryCall(
    "Musical Theatre Dancers Intensive 2027",
    `<main><p>Applications close in 2027.</p></main>`,
    `<main><h1>Musical Theatre Dancers Intensive 2025</h1><p>Applications are open for 2025.</p></main>`,
    "https://banff.example/programs/musical-theatre-dancers-intensive-2025",
  ), false);
});

test("directory details fail closed when they expose only forms, files, redirects, or bare homepages", () => {
  const detail = source({
    id: "resartis-no-canonical-host",
    name: "Residency listing",
    url: "https://resartis.org/open-call/residency-listing/",
    discoveryAdapterId: "resartis-detail",
  });
  const html = `
    <main>
      <a href="https://forms.gle/example">Apply</a>
      <a href="https://drive.google.com/file/d/example/view">Application PDF</a>
      <a href="https://www.dropbox.com/s/example/application.pdf">Download</a>
      <a href="http://url.organizer.example/track">Apply now</a>
      <a href="https://organizer.example/">Organizer home</a>
    </main>
  `;

  assert.deepEqual(discoverSourceLinks(detail, html, detail.url), []);
});

test("On the Move discovery uses the complete deadlines index and excludes navigation", () => {
  const index = source({
    id: "on-the-move-index",
    name: "On the Move Open Calls",
    url: "https://on-the-move.org/news/deadlines",
    discoveryAdapterId: "on-the-move-index",
  });
  const html = `
    <main>
      <a href="/news/deadlines">Deadlines</a>
      <a href="/news/countries">Open Calls by Country</a>
      <a href="/news/?f%5B0%5D=region%3A219">Nigeria</a>
      <a href="/news/culture-moves-europe-follow-up-survey">
        Culture Moves Europe: Follow-up Survey. Deadline: 30 Sep 2026
      </a>
      <a href="/news/airvine-residence-kyoto" class="link-block">
        AiRViNe Residence Exchange Programme 2026. Deadline: 16 Aug 2026
      </a>
      <a href="https://example.org/not-an-on-the-move-detail">External article</a>
    </main>
  `;

  assert.deepEqual(discoverSourceLinks(index, html, index.url), [
    {
      url: "https://on-the-move.org/news/airvine-residence-kyoto",
      title: "AiRViNe Residence Exchange Programme 2026",
      kind: "directory",
      registryTier: 2,
      followsOutboundLinks: true,
      discoveryAdapterId: "on-the-move-detail",
      discoveredFromSourceId: "on-the-move-index",
      checkIntervalHours: 24,
    },
  ]);
});

test("On the Move detail discovery proposes only the strongest official call page", () => {
  const detail = source({
    id: "on-the-move-detail",
    name: "AiRViNe Residence Exchange Programme 2026",
    url: "https://on-the-move.org/news/airvine-residence-kyoto",
    discoveryAdapterId: "on-the-move-detail",
  });
  const html = `
    <main><article>
      <h1>AiRViNe Residence Exchange Programme 2026</h1>
      <p>Applications close on 16 August 2026.</p>
      <a href="https://airvine.info/about/">About AiRViNe</a>
      <a href="https://airvine.info/2026/07/26/open-call-residence-exchange-programme/?view=programme&amp;cid=352">More info and apply</a>
      <a href="https://docs.google.com/forms/d/example/viewform">Application form</a>
    </article></main>
  `;

  assert.deepEqual(discoverSourceLinks(detail, html, detail.url).map((link) => link.url), [
    "https://airvine.info/2026/07/26/open-call-residence-exchange-programme/?view=programme&cid=352",
  ]);
});

test("Film Independent discovery follows program sections, not generic opportunity records", () => {
  const index = source({
    id: "film-independent-index",
    name: "Film Independent Programs",
    url: "https://www.filmindependent.org/programs/",
    discoveryAdapterId: "film-independent-index",
  });
  const html = `
    <nav>
      <a href="/programs/">Programs</a>
      <a href="/programs/applications/">Applications</a>
      <a href="/programs/grants-and-awards/">Grants &amp; Awards</a>
      <a href="/programs/education-events-classes/">Events &amp; Classes</a>
      <a href="https://www.instagram.com/filmindependent/">Instagram</a>
    </nav>
  `;

  assert.deepEqual(discoverSourceLinks(index, html, index.url), [
    {
      url: "https://www.filmindependent.org/programs/applications/",
      title: "Applications",
      kind: "directory",
      registryTier: 2,
      followsOutboundLinks: true,
      discoveryAdapterId: "film-independent-detail",
      discoveredFromSourceId: "film-independent-index",
    },
    {
      url: "https://www.filmindependent.org/programs/grants-and-awards/",
      title: "Grants & Awards",
      kind: "directory",
      registryTier: 2,
      followsOutboundLinks: true,
      discoveryAdapterId: "film-independent-detail",
      discoveredFromSourceId: "film-independent-index",
    },
  ]);
});

test("Film Independent section discovery keeps only specific program pages", () => {
  const section = source({
    id: "film-independent-section",
    name: "Film Independent Artist Development",
    url: "https://www.filmindependent.org/programs/artist-development/",
    discoveryAdapterId: "film-independent-detail",
  });

  assert.deepEqual(
    discoverSourceLinks(section, `
      <a href="/programs/artist-development/screenwriting-lab/">Screenwriting Lab</a>
      <a href="/programs/artist-development/documentary-lab/">Documentary Lab</a>
      <a href="/programs/artist-development/">Artist Development</a>
      <a href="/programs/education-events-classes/">Events</a>
      <a href="https://www.instagram.com/filmindependent/">Instagram</a>
    `, section.url).map((link) => link.url),
    [
      "https://www.filmindependent.org/programs/artist-development/screenwriting-lab/",
      "https://www.filmindependent.org/programs/artist-development/documentary-lab/",
    ],
  );
});

test("Film Independent replaces generic card labels with the canonical page title", () => {
  const section = source({
    id: "film-independent-section",
    name: "Film Independent Artist Development",
    url: "https://www.filmindependent.org/programs/artist-development/",
    discoveryAdapterId: "film-independent-detail",
  });

  const [link] = discoverSourceLinks(section, `
    <a href="/programs/artist-development/documentary-lab/">More Information</a>
  `, section.url);

  assert.equal(link?.title, "Documentary Lab");
  assert.equal(link?.registryTier, 0);
  assert.equal(link?.followsOutboundLinks, false);
});
