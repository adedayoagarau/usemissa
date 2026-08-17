import type { SourceDefinition } from "./contracts.js";

export type SourceDesk =
  | "writing"
  | "visual-arts"
  | "film-media"
  | "performing-arts"
  | "music"
  | "architecture-design"
  | "funding"
  | "identity-community";

export type SourceRole =
  | "structured-authority"
  | "official-publisher"
  | "application-platform"
  | "discovery-desk"
  | "community-signal";

export type SourceStructure =
  "api" | "rss" | "sitemap" | "bounded-index" | "detail-page" | "newsletter";
export type SourceAccess =
  "allowed" | "partner-required" | "manual-only" | "blocked" | "unknown";
export type PublicationAuthority = "none" | "application-state" | "full";

export interface SourceRefreshPolicy {
  baseCadenceHours: number;
  minimumCadenceHours: number;
  maximumCadenceHours: number;
  nearDeadlineCadenceHours: number;
  finalDeadlineCadenceHours: number;
  unchangedBackoffAfterRuns: number;
  failureCooldownAfterRuns: number;
}

export interface SourceManifestEntry {
  id: string;
  registrySourceId: string;
  name: string;
  desk: SourceDesk;
  role: SourceRole;
  structure: SourceStructure;
  access: SourceAccess;
  runnable: boolean;
  disabledReason?: string;
  urlOverride?: string;
  adapterId?: SourceDefinition["adapterId"];
  kindOverride?: SourceDefinition["kind"];
  stableItemId: string;
  artFormVerticalIds: string[];
  firstPartyDestinationRequired: boolean;
  publicationAuthority: PublicationAuthority;
  maxIndexPages: number;
  maxChangedChildrenPerRun: number;
  refresh: SourceRefreshPolicy;
  configOverride?: Record<string, unknown>;
}

const DAILY: SourceRefreshPolicy = {
  baseCadenceHours: 24,
  minimumCadenceHours: 6,
  maximumCadenceHours: 168,
  nearDeadlineCadenceHours: 24,
  finalDeadlineCadenceHours: 6,
  unchangedBackoffAfterRuns: 7,
  failureCooldownAfterRuns: 3,
};

const EVERY_TWO_DAYS: SourceRefreshPolicy = { ...DAILY, baseCadenceHours: 48 };

/**
 * Deliberately small first operating tranche. Runnable means safe to execute
 * in shadow/review mode; it does not grant publication authority.
 */
export const FIRST_TRANCHE_SOURCE_MANIFEST: readonly SourceManifestEntry[] = [
  {
    id: "grants-gov-arts",
    registrySourceId: "src_grants-us-national_grants_gov_arts_funding_400",
    name: "Grants.gov Arts Opportunities",
    desk: "funding",
    role: "structured-authority",
    structure: "api",
    access: "allowed",
    runnable: true,
    adapterId: "json-api-v2",
    urlOverride: "https://api.grants.gov/v1/api/search2",
    stableItemId: "data.oppHits[].id",
    artFormVerticalIds: ["grants-us-national"],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 1,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      transport: "json",
      recordPath: "data.oppHits",
      recordFilter: {
        requiredPaths: ["closeDate"],
        datePath: "closeDate",
        maximumDaysAhead: 1095,
      },
      fieldMap: {
        id: "id",
        title: "title",
        organization: ["agency", "agencyName"],
        deadline: "closeDate",
      },
      request: {
        method: "POST",
        body: {
          rows: 25,
          keyword: "arts",
          oppStatuses: "forecasted|posted",
          fundingCategories: "AR",
        },
      },
      detailRequest: {
        url: "https://api.grants.gov/v1/api/fetchOpportunity",
        method: "POST",
        bodyField: "opportunityId",
        canonicalUrlTemplate: "https://www.grants.gov/search-results-detail/{{id}}",
        detailRecordPath: "data",
        detailFieldMap: {
          id: "id",
          title: "opportunityTitle",
          organization: "synopsis.agencyName",
          description: "synopsis.synopsisDesc",
          deadline: [
            "originalDueDate",
            "synopsis.responseDate",
            "opportunityPkgs.0.closingDate",
          ],
          openDate: ["synopsis.postingDate", "opportunityPkgs.0.openingDate"],
        },
      },
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        // The server-rendered page contains 25 contest links but can rotate
        // their presentation order (and occasionally one boundary card).
        // Collect only the links already present in this one root response,
        // stabilize by URL, then let execution fetch its smaller 15/5 budget.
        scanLimit: 50,
        candidateOrder: "url",
        rules: [
          {
            role: "detail",
            patterns: ["fetchOpportunity"],
            authority: "destination",
          },
        ],
      },
    },
  },
  {
    id: "eu-funding-tenders-creative-europe",
    registrySourceId: "src_grants-international_creative_europe_108",
    name: "EU Funding & Tenders: Creative Europe",
    desk: "funding",
    role: "structured-authority",
    structure: "api",
    access: "allowed",
    runnable: true,
    adapterId: "json-api-v2",
    urlOverride: "https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=***",
    stableItemId: "topic identifier",
    artFormVerticalIds: ["grants-international"],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 1,
    maxChangedChildrenPerRun: 10,
    refresh: DAILY,
    configOverride: {
      transport: "json",
      request: {
        method: "POST",
        multipart: {
          query: {
            filename: "query.json",
            contentType: "application/json",
            json: {
              bool: {
                must: [
                  { terms: { type: ["1", "2", "8"] } },
                  { terms: { status: ["31094501", "31094502"] } },
                  { terms: { frameworkProgramme: ["43251814"] } },
                  { terms: { language: ["en"] } },
                ],
              },
            },
          },
          pageSize: "100",
          pageNumber: "1",
          language: "en",
        },
      },
      responseBound: { countPath: "totalResults", maximum: 100 },
      recordPath: "results",
      recordFilter: {
        requiredPaths: ["reference", "summary", "url"],
        datePath: "metadata.deadlineDate",
        maximumDaysAhead: 1095,
      },
      fieldMap: {
        id: "reference",
        url: ["url", "metadata.url"],
        title: ["summary", "metadata.callTitle"],
        description: ["metadata.description", "metadata.furtherInformation"],
        deadline: "metadata.deadlineDate",
        openDate: "metadata.startDate",
      },
      constantFields: { organization: "Creative Europe" },
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 5,
        requireCurrentDeadlineBeforeReview: true,
        structuredRecordAuthority: true,
        destinationAdapterId: "generic-html-v2",
        allowedHosts: ["ec.europa.eu"],
        rules: [
          { role: "detail", patterns: ["/topic-details/", "/competitive-calls-cs/"], authority: "destination" },
        ],
      },
    },
  },
  {
    id: "on-the-move-open-calls",
    registrySourceId: "src_grants-international_on_the_move_109",
    name: "On the Move Open Calls",
    desk: "funding",
    role: "discovery-desk",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    urlOverride: "https://on-the-move.org/news/deadlines",
    stableItemId: "normalized detail URL",
    artFormVerticalIds: [
      "grants-international",
      "visual-open-call",
      "dance-choreography",
      "music-composition",
      "literary-fiction",
      "architecture-built",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 2,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 15,
        requireCurrentDeadlineBeforeReview: true,
        excludedPatterns: ["/news/deadlines", "/news/countries"],
        rules: [
          {
            role: "detail",
            patterns: ["/news/"],
            authority: "destination",
          },
        ],
        firstPartyHop: {
          articleOnly: true,
          limit: 1,
          excludedHosts: [
            "facebook.com",
            "instagram.com",
            "x.com",
            "twitter.com",
            "linkedin.com",
            "youtube.com",
            "bsky.app",
            "threads.net",
          ],
        },
      },
    },
  },
  {
    id: "poets-writers-contests",
    registrySourceId: "src_platform-poets-writers_poets_writers_contests_390",
    name: "Poets & Writers Contests",
    desk: "writing",
    role: "discovery-desk",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    stableItemId: "pw.org writing_contests detail URL",
    artFormVerticalIds: [
      "literary-fiction",
      "poetry",
      "creative-nonfiction",
      "novel-book",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 2,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      extraction: { titleClassNames: ["grant-listing-title"] },
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        rules: [
          {
            role: "detail",
            patterns: ["/writing_contests/", "read more"],
            authority: "destination",
          },
        ],
      },
    },
  },
  {
    id: "newpages-calls",
    registrySourceId: "src_literary-fiction_newpages_calls_and_contests_397",
    name: "NewPages Calls and Contests",
    desk: "writing",
    role: "discovery-desk",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    stableItemId: "normalized listing URL",
    artFormVerticalIds: [
      "literary-fiction",
      "poetry",
      "creative-nonfiction",
      "flash-hybrid",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 2,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      extraction: { titleClassNames: ["entry-title"] },
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 10,
        excludedPatterns: [
          "/guide-submission-opportunities/big-list-of-writing-contests/",
        ],
        rules: [
          {
            role: "detail",
            patterns: ["/guide-submission-opportunities/"],
            authority: "destination",
          },
        ],
        firstPartyHop: {
          articleOnly: true,
          limit: 1,
          excludedHosts: [
            "facebook.com",
            "instagram.com",
            "x.com",
            "twitter.com",
            "linkedin.com",
            "youtube.com",
            "bsky.app",
            "threads.net",
            "substack.com",
            "npofficespace.com",
          ],
        },
      },
    },
  },
  {
    id: "transartists-open-calls",
    registrySourceId: "src_grants-international_transartists_open_calls_110",
    name: "TransArtists Open Calls",
    desk: "visual-arts",
    role: "discovery-desk",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    stableItemId: "transartists call URL",
    artFormVerticalIds: [
      "visual-residency",
      "writing-residency",
      "dance-choreography",
      "music-composition",
      "curatorial",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 2,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 10,
        rules: [
          { role: "detail", patterns: ["/en/news/"], authority: "destination" },
        ],
        firstPartyHop: {
          articleOnly: true,
          limit: 1,
          excludedHosts: ["facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com", "youtube.com", "bsky.app", "threads.net", "docs.google.com", "forms.gle"],
        },
      },
    },
  },
  {
    id: "artconnect-opportunities",
    registrySourceId: "src_grants-international_artconnect_opportunities_418",
    name: "ArtConnect Opportunities",
    desk: "visual-arts",
    role: "discovery-desk",
    structure: "bounded-index",
    access: "unknown",
    runnable: true,
    stableItemId: "ArtConnect opportunity URL",
    artFormVerticalIds: [
      "visual-open-call",
      "visual-residency",
      "photography",
      "curatorial",
      "craft-design",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 1,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      embeddedJson: {
        scriptId: "__NEXT_DATA__",
        recordPath: "props.pageProps.opportunities.data",
        fieldMap: {
          id: "id",
          url: ["contact.url", "apply.onlineForm"],
          title: "title",
          organization: "profile.organizationName",
          description: "description.0.content",
          deadline: "deadline",
          opportunityType: "type",
        },
        requiredEquals: {
          "attributes.isPublished": true,
          "attributes.isPending": false,
        },
        datePath: "deadline",
        maximumDaysAhead: 1095,
      },
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 10,
      },
    },
  },
  {
    id: "curatorspace-opportunities",
    registrySourceId: "src_curatorial_curatorspace_open_calls_424",
    name: "CuratorSpace Opportunities",
    desk: "visual-arts",
    role: "application-platform",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    stableItemId: "CuratorSpace opportunity id",
    artFormVerticalIds: [
      "curatorial",
      "visual-open-call",
      "craft-design",
      "performance-art",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 2,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 10,
        rules: [
          { role: "detail", patterns: ["/opportunities/detail/"], authority: "destination" },
        ],
      },
    },
  },
  {
    id: "playbill-jobs-calls",
    registrySourceId: "src_theater-playwriting_playbill_jobs_and_calls_457",
    name: "Playbill Jobs and Calls",
    desk: "performing-arts",
    role: "discovery-desk",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    stableItemId: "Playbill listing URL",
    artFormVerticalIds: [
      "theater-playwriting",
      "dance-choreography",
      "music-composition",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 2,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 10,
        requiredLinkRegex: "(?:deadline\\s*:?\\s*)?\\b(?:0?[1-9]|1[0-2])[.\\/-](?:0?[1-9]|[12]\\d|3[01])[.\\/-]\\d{2}\\b",
        rules: [
          { role: "detail", patterns: ["/job/"], authority: "destination" },
        ],
        sourceCard: {
          titleClassName: "pb-tile-title",
          deadlineFromLinkLabel: "mdy-short",
        },
      },
    },
  },
  {
    id: "music-in-africa-opportunities",
    registrySourceId: "src_music-composition_music_in_africa_opportunities_451",
    name: "Music In Africa Opportunities",
    desk: "music",
    role: "discovery-desk",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    stableItemId: "Music In Africa article URL",
    artFormVerticalIds: ["music-composition"],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 2,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 15,
        requireCurrentDeadlineBeforeReview: true,
        rules: [
          { role: "detail", patterns: ["/magazine/open-call", "/magazine/apply-now", "/magazine/call-for"], authority: "destination" },
        ],
        firstPartyHop: {
          articleOnly: true,
          limit: 1,
          excludedHosts: ["facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com", "youtube.com", "bsky.app", "threads.net", "wa.me", "siege.ai", "gmpg.org", "portal.prohelvetia.ch"],
        },
      },
    },
  },
  {
    id: "archdaily-competitions",
    registrySourceId: "src_architecture-built_archdaily_competitions_461",
    name: "ArchDaily Competitions",
    desk: "architecture-design",
    role: "discovery-desk",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    stableItemId: "ArchDaily competition URL",
    artFormVerticalIds: ["architecture-built", "craft-design"],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 2,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 2,
        scanLimit: 15,
        requireCurrentDeadlineBeforeReview: true,
        detailPathRegex: "^/\\d+/[a-z0-9-]+$",
        firstPartyHop: {
          articleOnly: true,
          limit: 1,
          excludedHosts: ["facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com", "youtube.com", "bsky.app", "threads.net", "pinterest.com", "adsttc.com"],
        },
      },
    },
  },
  {
    id: "sundance-deadlines",
    registrySourceId:
      "src_documentary_sundance_institute_artist_opportunities_435",
    name: "Sundance Institute Deadlines",
    desk: "film-media",
    role: "official-publisher",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    urlOverride: "https://www.sundance.org/deadlines/",
    stableItemId: "Sundance program application URL",
    artFormVerticalIds: [
      "film-festival",
      "screenwriting",
      "documentary",
      "animation-new-media",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 1,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 5,
        allowedHosts: ["apply.sundance.org", "filmfreeway.com"],
        rules: [
          { role: "apply", patterns: ["/prog/", "sundanceepisodiclab"], authority: "destination" },
        ],
        sourceCard: {
          beforeChars: 8_000,
          organization: "Sundance Institute",
          allowBlockedDestination: true,
        },
      },
    },
  },
  {
    id: "res-artis-open-calls",
    registrySourceId: "src_platform-resartis_res_artis_open_calls_206",
    name: "Res Artis Open Calls",
    desk: "visual-arts",
    role: "application-platform",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    urlOverride: "https://resartis.org/resartis-open-calls/",
    stableItemId: "Res Artis open-call URL",
    artFormVerticalIds: [
      "visual-residency",
      "writing-residency",
      "dance-choreography",
      "music-composition",
      "curatorial",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 2,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 15,
        requireCurrentDeadlineBeforeReview: true,
        allowedHosts: ["resartis.org"],
        rules: [
          {
            role: "detail",
            patterns: ["/open-call/"],
            authority: "destination",
          },
        ],
        firstPartyHop: {
          articleOnly: true,
          limit: 1,
          excludedHosts: [
            "facebook.com",
            "instagram.com",
            "x.com",
            "twitter.com",
            "linkedin.com",
            "youtube.com",
            "wordpress.org",
            "pixelgrade.com",
            "cookiedatabase.org",
            "fonts.gstatic.com",
          ],
        },
      },
    },
  },
  {
    id: "creative-west-art-opportunities",
    registrySourceId: "src_platform-cafe_caf_public_calls_386",
    name: "Creative West Art Opportunities",
    desk: "visual-arts",
    role: "application-platform",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    kindOverride: "directory",
    urlOverride: "https://opportunities.wearecreativewest.org/",
    stableItemId: "Creative West opportunity id and provider",
    artFormVerticalIds: [
      "visual-open-call",
      "public-art",
      "photography",
      "craft-design",
      "arts-festivals",
    ],
    firstPartyDestinationRequired: false,
    publicationAuthority: "none",
    maxIndexPages: 1,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 15,
        candidateOrder: "url",
        requireCurrentDeadlineBeforeReview: true,
        allowedHosts: ["opportunities.wearecreativewest.org"],
        detailPathRegex: "^/opportunity/\\d+/(?:CAFE|ZAPP|GOSMART)$",
      },
    },
  },
  {
    id: "festhome-festivals",
    registrySourceId: "src_platform-filmfreeway_festhome_431",
    name: "Festhome Festivals",
    desk: "film-media",
    role: "application-platform",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    kindOverride: "directory",
    urlOverride: "https://festhome.com/en/festivals",
    stableItemId: "Festhome festival id",
    artFormVerticalIds: [
      "film-festival",
      "documentary",
      "animation-new-media",
      "screenwriting",
    ],
    firstPartyDestinationRequired: false,
    publicationAuthority: "none",
    maxIndexPages: 1,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 15,
        requireCurrentDeadlineBeforeReview: true,
        allowedHosts: ["festhome.com"],
        detailPathRegex: "^/festival/\\d+$",
      },
    },
  },
  {
    id: "artdeadline-opportunities",
    registrySourceId: "src_platform-cafe_artdeadline_395",
    name: "ArtDeadline Opportunities",
    desk: "visual-arts",
    role: "discovery-desk",
    structure: "rss",
    access: "allowed",
    runnable: true,
    adapterId: "feed-v2",
    urlOverride: "https://artdeadline.com/feed/?post_type=job_listing",
    stableItemId: "ArtDeadline opportunity URL",
    artFormVerticalIds: [
      "visual-open-call",
      "photography",
      "craft-design",
      "visual-residency",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 1,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      transport: "rss",
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 10,
        requireCurrentDeadlineBeforeReview: true,
        destinationAdapterId: "generic-html-v2",
        allowedHosts: ["artdeadline.com"],
        rules: [
          {
            role: "detail",
            patterns: ["/ops/"],
            authority: "destination",
          },
        ],
        firstPartyHop: {
          articleOnly: true,
          limit: 1,
          excludedHosts: [
            "facebook.com",
            "instagram.com",
            "x.com",
            "twitter.com",
            "linkedin.com",
            "youtube.com",
            "threads.net",
            "bsky.social",
            "mastodon.social",
          ],
        },
      },
    },
  },
  {
    id: "chill-subs-contests",
    registrySourceId: "src_platform-chill-subs_chill_subs_393",
    name: "Chill Subs Contests",
    desk: "writing",
    role: "application-platform",
    structure: "bounded-index",
    access: "allowed",
    runnable: true,
    adapterId: "chill-subs-next-v2",
    urlOverride: "https://www.chillsubs.com/browse/contests",
    stableItemId: "Chill Subs call id",
    artFormVerticalIds: [
      "writing-contest",
      "poetry",
      "fiction-short-stories",
      "nonfiction-essay",
      "hybrid-cross-genre",
    ],
    firstPartyDestinationRequired: true,
    publicationAuthority: "none",
    maxIndexPages: 1,
    maxChangedChildrenPerRun: 5,
    refresh: DAILY,
    configOverride: {
      transport: "chill-subs-next",
      destination: {
        pageRole: "landing",
        detailLimit: 5,
        scanLimit: 15,
        requireCurrentDeadlineBeforeReview: true,
        destinationAdapterId: "chill-subs-next-v2",
        allowedHosts: ["www.chillsubs.com", "chillsubs.com"],
        rules: [
          {
            role: "detail",
            patterns: ["/magazine/", "/press/", "/organization/"],
            authority: "destination",
          },
        ],
        firstPartyHop: {
          articleOnly: true,
          limit: 1,
        },
      },
    },
  },
] as const;

export function validateSourceManifest(
  entries: readonly SourceManifestEntry[] = FIRST_TRANCHE_SOURCE_MANIFEST,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const registryIds = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) errors.push(`duplicate manifest id: ${entry.id}`);
    if (registryIds.has(entry.registrySourceId))
      errors.push(`duplicate registry source id: ${entry.registrySourceId}`);
    ids.add(entry.id);
    registryIds.add(entry.registrySourceId);
    if (entry.runnable && entry.access === "blocked")
      errors.push(`blocked source cannot be runnable: ${entry.id}`);
    if (entry.maxIndexPages < 1 || entry.maxChangedChildrenPerRun < 1)
      errors.push(`source budgets must be positive: ${entry.id}`);
    if (entry.publicationAuthority !== "none")
      errors.push(`first tranche must remain non-publishing: ${entry.id}`);
  }
  return errors;
}
