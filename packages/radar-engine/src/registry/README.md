# Trusted Opportunity Source Registry

> **1,114 curated registry sources** across **49 verticals**, with explicit trust posture and canonical taxonomy coverage for Missa Radar ingestion.

The registry is trusted in a deliberately bounded sense: tier-0 and tier-1 entries are curated
monitoring sources, while tier-2 directories and tier-3 feeds remain discovery inputs that need
review. A curated source is not a live verification claim about every deadline on its pages.

`taxonomyTermIds` contains only canonical terms resolved by the shared `@missa/taxonomy` resolver.
`coverage` reports every selectable term across all 12 facets. Discipline and genre gaps are
intentional discovery work; they must not be filled by copying a broad practice label into a
narrower term.

This registry is the seed list for crawling and monitoring artist/writer opportunities. It follows the three-tier graph model:

| Tier | Kind | Role |
|------|------|------|
| **0** | `organization-website` | Canonical org guideline / open-call page |
| **1** | `partner-feed` | Submission platform (Submittable, CaFÉ, FilmFreeway) |
| **2** | `directory` | Aggregator — discovery seed; follow outbound links |
| **3** | `feed` | Newsletter / RSS syndication |

## Vertical groups

| Group | Verticals | Example sources |
|-------|-----------|-----------------|
| **literary** | fiction, poetry, CNF, flash, YA, translation, writing residencies | Kenyon Review, Poetry Magazine, Civitella Ranieri |
| **visual-arts** | residencies, open calls, photography, public art, printmaking | ISCP, Res Artis members, Public Art Fund |
| **performing-arts** | theater, dance, performance | Eugene O'Neill, Jacob's Pillow |
| **film-media** | festivals, screenwriting, documentary, new media | Sundance, Nicholl, ITVS |
| **music** | composition, sound art | New Music USA, BMI Foundation |
| **grants-funding** | US national, US state (56 councils), international, fellowships | NEA, state arts councils, Canada Council |
| **awards-festivals** | prizes, multidisciplinary festivals | Whiting Awards, Edinburgh Fringe |
| **academic-professional** | conference CFPs, museum open calls | AWP, Tate |
| **craft-design** | comics, craft, architecture | SPX, Core77 |
| **platforms** | Submittable, CaFÉ, Res Artis, Duotrope, Poets & Writers | Tier-1/2 discovery seeds |

## Files

```
src/registry/
├── types.ts              # RegistryVertical, SourceRegistryEntry, trust and coverage contracts
├── verticals.ts          # 49 vertical definitions
├── helpers.ts            # org() / platform() / directory() builders
├── assemble.ts           # Merge bundles + bulk JSON → full registry
├── sources-bulk.json     # Generated non-literary sources (grants, film, visual…)
├── sources.json          # Full assembled export (1114 entries + coverage summary)
├── bundles/
│   ├── literary-fiction.ts   # 131 tier-0 lit mags
│   ├── poetry.ts             # 128 tier-0 poetry markets
│   └── creative-nonfiction.ts # 127 tier-0 CNF markets
└── scripts/generate-registry.mjs  # Regenerate sources-bulk.json
```

## CLI

```bash
# Summary stats
npm run build && node dist/src/cli.js registry stats

# Show every taxonomy facet's covered/thin/gap terms
node dist/src/cli.js registry coverage --limit 50

# List sources (filter by group or vertical)
node dist/src/cli.js registry list --group literary --limit 20
node dist/src/cli.js registry list --vertical poetry --limit 10
node dist/src/cli.js registry list --max-tier 2   # directories only

# List vertical taxonomy
node dist/src/cli.js registry verticals
node dist/src/cli.js registry verticals --group grants-funding

# Export filtered subset
node dist/src/cli.js registry export --group film-media --out film-sources.json

# Regenerate bulk JSON from script
npm run registry:generate
```

## Loading into RadarEngine

```typescript
import { RadarEngine, assembleRegistry, loadSourcesIntoEngine } from '@missa/radar-engine';

const engine = new RadarEngine();

// Load all tier-0 org pages (canonical sources only)
loadSourcesIntoEngine(
  (input) => engine.addSource({ ...input, kind: input.kind ?? 'organization-website' }),
  { maxTier: 0 },
);

// Or load literary vertical only
loadSourcesIntoEngine(
  (input) => engine.addSource(input),
  { groups: ['literary'] },
);
```

## Regenerating

Literary bundles are hand-curated TypeScript. Everything else is generated:

```bash
node scripts/generate-registry.mjs   # writes sources-bulk.json
npm run build
node dist/src/registry/export-json.js  # writes sources.json
```

## Design notes

- **URLs are deduplicated** — many magazines accept fiction + poetry + CNF on one `/submit` page; the registry keeps one canonical entry per URL.
- **Tier-2 directories** (`followsOutboundLinks: true`) are discovery seeds — the crawler should enqueue linked org pages as new tier-0 sources.
- **Not verified live** — URLs are curated starting points; the engine's change detection and verification queue handle stale or moved pages.
- **Respect robots.txt and source terms** before production crawling.
