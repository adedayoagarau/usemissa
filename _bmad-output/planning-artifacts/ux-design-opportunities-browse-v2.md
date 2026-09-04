---
title: Opportunities Browse UX Specification
product: Missa Passport
status: Approved for prototype build
date: 2026-09-04
author: Sally (UX Designer)
direction: Wellfound + Behance white index (Option A)
prototype_route: /design-system/opportunities-browse-v2
stepsCompleted:
  - design-direction-decision
  - party-mode-review
  - advanced-elicitation-pre-mortem
  - advanced-elicitation-persona-focus-group
  - advanced-elicitation-failure-mode-analysis
  - advanced-elicitation-comparative-matrix
inputDocuments:
  - DESIGN.md
  - .cursor/rules/homepage-art-direction.mdc
  - apps/web/components/design-system/opportunities-browse-v2-preview.tsx
---

# Opportunities Browse · UX Specification

**Author:** Sally (UX) · **Stakeholder:** Adedayo  
**Status:** Approved for prototype build (design-system first)  
**Chosen direction:** Wellfound job-search index + Behance explore grid

---

## 1. Page contract

| Surface | Job |
|--------|-----|
| Homepage `/` | Brand + one Forest hero moment. Caption-scale type. **Explore** CTA. |
| **Opportunities `/opportunities`** | **Tool.** White index. Search-first. Filters. Cards carry imagery. |
| Opportunity detail | Evidence, deadline, apply. Out of scope here. |

**Emotional target:** Competent, calm, editorial-but-not-billboard. Missa feels like a serious index for creators, not a campaign landing page repeated twice.

**User story:** *"I came from the homepage (or search). I know what Missa is. Now I want to find a grant, residency, or open call — fast — without feeling like I landed on a second marketing site."*

---

## 2. Design direction decision

### Chosen: White index (Option A)

**Steal from Wellfound:** section-scale title, search + count + filters + cards.  
**Steal from Behance:** true-white canvas, imagery in cards only, quiet chrome.  
**Avoid:** second full-bleed photo hero, display H1 (48–80px), primary-filled search, curated chips inside hero band.

### Relationship to homepage hero

Homepage owns the brand moment (Forest knit plate, caption H1). Browse rhymes typographically but at **catalogue scale**, not hero-on-photo scale.

---

## 3. Preserve / reserve strategy

| Policy | Detail |
|--------|--------|
| **Preserve live `/opportunities`** | No production cutover until explicit approval |
| **Prototype first** | `/design-system/opportunities-browse-v2` |
| **Reserve editorial hero** | Archive at `/design-system/opportunities-editorial` — do not delete |
| **Preserve data & behavior** | `OpportunityBrowseProjection`, URL parsers, facets, save-to-tracker, official artwork |
| **Reserve homepage Act 2** | "Open now" lives on homepage, not browse |
| **Cutover mechanism** | Feature flag on same URL → soak ≥2 weeks → remove old path same release train |
| **Cutover gate** | 48h analytics baseline; SEO parity; save-to-tracker + deep-link parity; collection CTR monitored |

---

## 4. Information architecture (top → bottom)

```
┌─────────────────────────────────────────────────────────┐
│ Site header (MissaWordmark · nav · auth)                │ 72px min
├─────────────────────────────────────────────────────────┤
│ Page intro                                              │
│   Eyebrow: "Opportunities"                              │
│   H1 (section scale) + lede          │  count (tabular) │
├─────────────────────────────────────────────────────────┤
│ Collections band (labeled)                              │ stack 24
├─────────────────────────────────────────────────────────┤
│ Search (48px)                                           │ stack 12
│ Filter bar (Type · Discipline · Location · …)         │
│ Active filter chips + Clear all                         │
│ Results meta: "N results" · Sort                        │ stack 24
├─────────────────────────────────────────────────────────┤
│ Card grid (responsive)                                  │ gap 24
│ … pagination / load more …                              │
└─────────────────────────────────────────────────────────┘
```

**No** hero band. **No** field photo. **No** green scrim.

### Collections placement (Comparative Analysis Matrix winner)

**Option A — Collections above search** (score 23/25).

- Eyebrow label: `Collections` (11px, uppercase, accent-deep)
- Text links: 13px, 500 weight, hover underline — min 44px tap height on mobile
- Include full `/discover/*` set from editorial hero (Queer & LGBTQ+, BIPOC, Women & Non-Binary, Disabled & Neurodivergent, Emerging & Debut, Creative Jobs) plus discipline/type shortcuts (Poetry, Grants, etc.)
- Trailing link: **All collections →** (future index or expand)
- Wrap on mobile; no horizontal-only scroll trap

**Phase 2 fallback:** If collection CTR < hero-chip baseline after 30 days, test hybrid (3 featured + "All collections").

---

## 5. Spacing & layout tokens

| Region | Token | Value |
|--------|-------|-------|
| Page max width | Marketing container | `1360px` |
| Page gutter | Desktop / tablet / mobile | `32 / 24 / 16px` |
| Main padding top | Section stack | `clamp(32px, 5vw, 56px)` |
| Main padding bottom | Section stack | `96px` |
| Intro → collections | Stack | `24px` |
| Collections → search | Stack | `24px` |
| Search → filters | Stack | `12px` |
| Filters → results meta | Stack | `24px` |
| Card grid gap | Gap | `24px` |
| Card grid columns | Responsive | 1 → 2 @768 → 3 @1024 |

Law 2 check: within-group 12px; between-group ≥24px ✓

---

## 6. Typography

| Element | Spec |
|---------|------|
| Eyebrow | 11px Instrument Sans, 650, uppercase, accent-deep |
| Page H1 | Newsreader, `clamp(18px, 2vw, 24px)`, 500, `-0.02em` |
| Lede | 14px Instrument Sans, muted, max `36rem` — **required for cold SEO landings** |
| Count | 13px, tabular nums, muted, right-aligned desktop |
| Collections links | 13px, 500 |
| Search input | 14px |
| Card title | 18px Instrument Sans, 650 (via project card) |
| Card meta | Fragment Mono 13px or Caption 12px |

---

## 7. Chrome specifications

### Site header
Reuse `MissaSiteHeader` pattern: 72px, bottom border, Opportunities `aria-current="page"`.

### Search
- 48px height, 1px border, `--radius-md`
- Left: search icon. Center: input. Right: Explore-style square mark + "Search"
- **Not** primary-filled
- Placeholder: *"Try Poetry, Grants, or search by organization…"*
- Clear (×) when `q` non-empty
- On submit: `aria-busy` on grid; scroll to `#results`

### Filters
- **≥768px:** Popover triggers (Type, Discipline, Location, Deadline, Fee)
- **<768px:** Bottom **filter sheet** with Apply / Clear — not clipped popovers
- Active selections → removable chips; "Clear all" when ≥1 active

### Sort + count
- Left: `{n} results` (or `{n} of {total}` when filtered)
- Right: sort control

---

## 8. Empty & zero-result states

| State | Treatment |
|-------|-----------|
| **No corpus** | "No opportunities published yet." + link to homepage Explore |
| **Zero filter/search match** | "No matches for [query/filters]." + **Clear filters** + **3 top collection links** (Poetry, Grants, Free to Enter) |
| **Pending fetch** | Grid `aria-busy`; subtle opacity |

Zero-result must never be a dead end.

---

## 9. Component strategy

### Registry installs (prototype phase)

```bash
# Add @uitripled to apps/web/components.json first
npx shadcn@latest add @uitripled/project-card-shadcnui
npx shadcn@latest add @uitripled/native-badge
```

### `project-card-shadcnui` → `OpportunityBrowseCard`

**Anatomy:** media (official artwork) · type badge · title (2-line clamp) · org · meta row (deadline · location · fee) · save-to-tracker footer

**Badge cap:** Max **2** overlays via `native-badge` — type + one status (Closing soon *or* No fee)

**Adaptation:** Retokenize to Missa tokens; map `OpportunityBrowseProjection`; register in component-policy + catalogue

### Preserve unchanged
`OpportunitySort`, `SaveToTrackerButton`, URL parsers (`opportunityQuery.ts`), `getOpportunityRepository`

### Deprecate on cutover (archive, don't delete)
`OpportunityEditorialHero`, redundant `OpportunityBrowseHeader`

---

## 10. Failure mode mitigations

| Region | Mitigation |
|--------|------------|
| Collections mobile | Wrap; 44px tap targets; above search |
| Search submit | aria-busy + scroll to results |
| Client vs server filter | URL = source of truth on submit; client filter = snappy overlay only |
| Missing card art | Type fallback plate; no broken image icon |
| Save-to-tracker | Footer slot; keyboard reachable — regression surface #1 |
| SEO | Title, description, canonical, structured data explicitly verified at cutover |

---

## 11. Persona-validated priorities

1. **Collections discoverability** (Maya — first-time poet on mobile)
2. **Search/filter speed** (James — repeat grant hunter)
3. **Card scan density** (James)
4. **Trust without hero** — live count + official card art (Dr. Chen — org evaluator)
5. **Save-to-tracker one tap** (all)

---

## 12. Success metrics (30-day post-cutover)

| Metric | Purpose |
|--------|---------|
| Collection CTR to `/discover/*` | Inclusion parity vs hero-chip era |
| Search/filter adoption within 10s | Tool-first validation |
| Apply/start rate by collection source | Downstream quality |
| Scroll depth to collections band | Prominence check |
| Creator diversity in applies | Inclusion guardrail |
| Bounce on direct `/opportunities` landings | Cold traffic health |

**Gate:** Collection CTR must not drop >15% vs 48h pre-cutover baseline without Phase 2 hybrid collections UI.

---

## 13. Responsive & accessibility

| Breakpoint | Behavior |
|------------|----------|
| 390px | Single column; count stacks below H1; filter sheet; collections wrap |
| 768px+ | 2-col grid; popover filters |
| 1024px+ | 3-col grid |
| 200% zoom | No horizontal scroll on search; chips wrap |
| Reduced motion | No card lift; opacity/border only |

One `<h1>`. Search `role="search"`. Filter sheet focus trap. Cards: tile → detail; tracker stops propagation.

---

## 14. Implementation phases

| Phase | Work |
|-------|------|
| 0 | ✅ UX spec approved |
| 1 | Add `@uitripled` registry; install + retokenize card + badge |
| 2 | Update v2 preview: IA reorder (collections above search), filter sheet mobile, empty states, new cards |
| 3 | Archive editorial hero → `/design-system/opportunities-editorial` |
| 4 | `npm run check:design-system` |
| 5 | Feature-flag cutover on `/opportunities` after sign-off |

**Deferred:** Postal type tiles (Option C), Forest band (Option B), homepage Act 2.

---

## 15. Party-mode & elicitation synthesis

**Unanimous:** Browse is a tool, not a second homepage. v2 preview is the integration lab.

**Key tension resolved:** Collections above search with labeled band preserves `/discover/*` discoverability without a photo hero.

**Architectural note (Winston):** Extract shared `OpportunitiesBrowseLayout` only on third production duplication; flag-first cutover.

**Product note (John):** Gate cutover on data, not aesthetics.
