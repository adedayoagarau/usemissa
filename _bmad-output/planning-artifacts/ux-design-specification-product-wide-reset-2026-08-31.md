---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'ux-design-revision'
status: 'in-progress'
supersedes: '_bmad-output/planning-artifacts/ux-design-specification.md'
inputDocuments:
  - '/Users/adedayoagarau/Downloads/DESIGN-miro.md'
  - 'DESIGN.md'
  - 'docs/missa-frontend-ia.md'
  - 'docs/missa-naming-decisions.md'
  - '_bmad-output/planning-artifacts/research/technical-missa-durable-frontend-and-platform-overhaul-research-2026-08-31.md'
  - 'docs/chillsubs-ui-capture-and-missa-interface-spec-2026-08-30.md'
---

# Product-wide UX Design Specification — Missa

**Author:** Adedayo
**Date:** 2026-08-31

---

This revision establishes one product-wide experience and design system for Missa. The completed July UX specification remains historical evidence and is not overwritten.

## Executive Summary

### Project Vision

Missa is one continuous opportunity-to-outcome system. It connects public discovery, creator preparation and tracking, organization publication and intake, review, decisions, delivery, and platform governance. The interface must preserve the identity, history, evidence, status, and available actions of an object as it moves between those contexts.

The reset is a product-outcome program supported by a governed design system. It should reduce the time and effort required to determine whether an opportunity is relevant and trustworthy, prepare and track a submission, publish a complete call, reach a defensible review decision, and correct unreliable opportunity information.

Miro contributes composition, rhythm, scale, modularity, visual confidence, and progressive disclosure. It does not determine Missa's domain model, information hierarchy, status semantics, content density, accessibility behavior, or interaction mechanics. Missa retains its white canvas, Aubergine identity, typography, evidence model, product vocabulary, and truthful treatment of uncertainty.

### Target Users

- Anonymous visitors moving from a public record into a trusted first-party application flow.
- First-time and returning creators comparing opportunities with incomplete or conflicting information.
- Active creators returning under deadline pressure to prepare work, understand the next required action, submit, and track outcomes.
- Small-organization administrators publishing or correcting recurring calls across multiple cycles.
- Multi-program organization teams coordinating intake, review, decisions, permissions, and delivery at operational density.
- Occasional reviewers entering briefly with limited context to make consequential judgments.
- Lead reviewers coordinating rounds, assignments, consistency, and decision readiness.
- Content-quality operators resolving uncertain source, taxonomy, identity, and publication claims.
- Platform administrators monitoring customers, authorization, queues, integrations, and system health.

These audiences share one product grammar. Density and composition may change by context; object identity, status meaning, action hierarchy, evidence treatment, and interaction rules may not.

### Key Design Challenges

- Create one coherent product without turning public, creator, and operational density modes into three subtly different applications.
- Preserve stable identity for an opportunity across catalogue, detail, Tracker, Calendar, Inbox, submission preparation, and organization operations.
- Distinguish verified, source-reported, inferred, inherited, conflicting, stale, and unknown information without making users interpret internal machinery.
- Keep official guidelines, application actions, workflow actions, and organization-management actions clear when their availability changes by role and state.
- Represent recurring calls and multiple opportunities from one organization without collapsing distinct records or duplicating organizational identity.
- Support people who hold both creator and organization roles without losing context, permissions, filters, drafts, or navigation continuity.
- Make image-free, sparse-data, long-content, failure, and unavailable states foundational design inputs rather than late exceptions.
- Support calm, mobile-first creator workflows and compact organization operations without sacrificing labels, provenance, focus visibility, or explanations.
- Keep authorization server-owned and visible through capability-aware actions, denial explanations, mutation authority, and audit behavior.
- Migrate without rewriting opportunity ingestion, permissions, workflow rules, information architecture, application architecture, and every route simultaneously.

### Design Opportunities

- Define invariant object, status, evidence, capability, action, and disclosure patterns before surface styling.
- Establish one token hierarchy: brand primitives → semantic tokens → component tokens → approved density modes.
- Map Miro-inspired ideas to durable primitives such as Stack, Cluster, Grid, Tile, Disclosure, Command Bar, Inspector, and Workspace Rail rather than copying screenshots.
- Separate entity presentation from workflow presentation so the same canonical object remains recognizable while surrounding actions and status change by context.
- Validate the system through two connected reference journeys:
  1. Discover a trustworthy opportunity → determine eligibility → save or track → prepare required work → submit or record submission → track status.
  2. Create a call → preview the creator-facing record → publish → receive a submission → review it.
- Use the same representative opportunity across public, creator, and organization contexts to test identity, evidence, actions, permissions, density, and continuity.
- Establish content stress tests and responsive contracts covering priority, reflow, truncation, disclosure, touch targets, focus, sticky regions, tables, lists, and inspectors.
- Create a route migration ledger assigning every current surface one disposition: retain, restyle, compose, redesign, defer, or retire.
- Measure comprehension, eligibility-decision accuracy, task completion, error recovery, accessibility, mobile completion, performance, data truthfulness, component consolidation, and operator correction rates—not visual consistency alone.

### Scope Boundaries and Migration Gate

The reset defines and implements presentation, interaction, content, responsive, accessibility, and shared view-model contracts. Required changes to ingestion, domain authority, permissions, submission rules, information architecture, or platform architecture remain separate governed tracks with explicit decisions and compatibility windows.

Migration proceeds through foundations, the creator reference journey, the organization reference journey, an evaluation gate, and then connected workflow migrations. New and legacy surfaces may coexist only with documented navigation consistency, component-version policy, release flags, analytics comparison, test evidence, and rollback paths. Legacy retirement requires parity and usage evidence.

The reset fails its gate if it degrades task completion, accessibility, mobile usability, data truthfulness, authorization behavior, performance, or cross-route continuity—or if it standardizes workflows that users cannot successfully complete.

## Core User Experience

### Defining Experience

Missa's defining experience is helping someone move confidently from an opportunity to an outcome without reconstructing the process across disconnected tools.

The creator loop is: understand what this opportunity is → decide whether it applies → take the correct next action → return to a trustworthy record of what happened.

The organization loop is: define a complete opportunity → publish the same truth creators will see → receive and evaluate submissions → communicate and record the outcome.

The same opportunity remains recognizable across discovery, preparation, tracking, publication, review, and reporting. Context changes its composition and available actions, not its identity or facts.

### Platform Strategy

Missa remains a responsive web product.

- Public and creator experiences are mobile-first and fully functional with touch, keyboard, and assistive technology.
- Organization operations are desktop-optimized but preserve essential actions on mobile and tablet.
- Reviewer tasks work well on mobile and tablet because reviewers may be occasional users working outside an office.
- Mouse efficiency and keyboard navigation are first-class in compact operational surfaces.
- URLs preserve discovery, filtering, selection, organization, and return context.
- Drafts and committed actions survive navigation, authentication transitions, refreshes, and recoverable failures.
- Offline behavior is limited to clearly identified cached content or drafts; the interface never implies that a server mutation succeeded while offline.
- First-party links, evidence, capability decisions, and authoritative status remain server-owned.

### Effortless Interactions

- Recognize the opportunity, organization, program, type, deadline, fee, award, location, and current availability.
- Understand which information is confirmed, uncertain, conflicting, stale, or missing.
- Determine eligibility without repeatedly reading an entire page.
- Move between summary and atomic detail without losing position or context.
- Save or track an opportunity.
- Select existing work and prepare required materials.
- Open the correct official guidelines or application destination.
- Return from an external submission destination and record what happened.
- See the same opportunity in Tracker, Calendar, Inbox, and organization views.
- Publish a call and preview exactly what creators will see.
- Review a submission without hunting for criteria, files, prior decisions, or the next action.
- Switch between creator and organization contexts without losing active work.

Automation may gather, reconcile, prefill, organize, remind, and explain. It must not silently invent facts, change consequential state, or represent an uncertain action as confirmed.

### Critical Success Moments

- A creator immediately understands whether an opportunity is relevant and sufficiently trustworthy to investigate.
- A creator reaches the correct official application destination rather than the crawling directory.
- A creator returns and sees a coherent record of preparation, submission, deadlines, and outcomes.
- An organization publishes a complete call and sees the creator-facing result before it becomes public.
- A reviewer makes and records a defensible judgment with the relevant work, criteria, context, and conflict state visible.
- A platform operator can correct one disputed fact without destroying its provenance or silently altering unrelated records.
- Missing images, sparse information, long titles, conflicting sources, expired calls, and service failures remain understandable and usable.
- Authorization denial, failed mutations, and partial completion are explained with a safe recovery path.

### Experience Principles

1. **One object, continuous identity.** Preserve identity, history, evidence, and status across every surface.
2. **Truth before decoration.** Design for missing, conflicting, stale, and source-reported information before enhanced imagery.
3. **The next action must be obvious and honest.** Distinguish guidelines, application, preparation, workflow, and management actions.
4. **Density changes; meaning does not.** Public, creator, and operational modes share semantics and interaction rules.
5. **Progressive disclosure preserves depth.** Summaries accelerate scanning; detail remains available without becoming a wall of metadata.
6. **Automation proposes and explains.** Consequential state requires authoritative confirmation, visible outcomes, and recovery.
7. **Continuity survives transitions.** Preserve filters, drafts, selected objects, return paths, and role context across devices and authentication boundaries.
8. **Accessibility is part of the component contract.** Keyboard, focus, touch, semantics, reduced motion, contrast, and reflow are defined before implementation.
9. **Measure comprehension and completion.** Success is determined by accurate decisions and completed journeys, not visual uniformity.

## Desired Emotional Response

### Primary Emotional Goals

Missa should make people feel clear, capable, and quietly supported.

Creators should feel that the opportunity landscape has become understandable and manageable. Organizations should feel operationally in control without entering an intimidating enterprise system. Reviewers should feel focused and properly equipped for a consequential task. Operators should feel they can inspect and correct the system without losing evidence or causing hidden damage.

The differentiating emotion is informed confidence: “I understand what this is, why it matters, what I need to do, and what Missa knows—or does not know.”

### Emotional Journey Mapping

- **First encounter — recognition and possibility.** The product feels distinctive, credible, and alive. Miro-informed scale and modular composition create energy while the proposition and available paths remain immediately understandable.
- **Discovery — curiosity without overload.** Browsing encourages exploration while keeping comparison calm. Opportunities do not compete through oversized images, badges, or manufactured urgency.
- **Evaluation — confidence rather than suspicion.** Evidence, eligibility, deadlines, fees, awards, requirements, and unknowns are clear enough to support a decision without forcing users to guess what Missa omitted.
- **Preparation — momentum rather than bureaucracy.** Requirements, existing work, missing materials, and next steps form a visible, finite path.
- **External handoff — trust rather than abandonment.** Leaving Missa for official guidelines or an application system feels intentional; the destination, reason, and return path remain clear.
- **Tracking and waiting — calm rather than compulsive checking.** Returning answers what changed, what needs attention, and what remains unresolved without manufacturing urgency.
- **Organization operations — command without intimidation.** Dense surfaces create scanability and control without requiring specialist training.
- **Review — focus and responsibility.** The interface reduces administrative distraction while respecting the seriousness of judging someone's work.
- **Failure or uncertainty — supported recovery.** When data conflicts, authorization fails, a service is unavailable, or an action has an unknown outcome, Missa remains candid and useful.

### Micro-Emotions

- confidence over confusion;
- trust over polish-driven skepticism;
- momentum over administrative drag;
- calm attention over artificial urgency;
- orientation over feature discovery;
- accomplishment over gamification;
- dignity over punitive status treatment;
- control over opaque automation;
- supported recovery over dead ends;
- belonging without forced community performance.

### Design Implications

- **Confidence** → clear hierarchy, stable object identity, reinforced titles, explicit labels, and visible next actions.
- **Trust** → first-party destinations, field-level evidence, freshness, uncertainty, and honest system status.
- **Calm** → white canvas, disciplined color, restrained motion, limited competing actions, and no noisy imagery.
- **Momentum** → persistent progress, reusable work, contextual requirements, immediate feedback, and resumable drafts.
- **Control** → visible automation boundaries, reversible operations, capability explanations, and audit history.
- **Dignity** → neutral treatment of declined, withdrawn, closed, and incomplete states.
- **Focus** → progressive disclosure, intentional density, keyboard support, and secondary detail contained in inspectors or drawers.
- **Recovery** → errors explain what happened, what remains safe, and what the user can do next.

Delight comes from recognition and relief: a requirement already satisfied, a deadline change clearly explained, a useful opportunity surfaced, or a complicated process made unexpectedly manageable. Routine actions do not need confetti, bouncing cards, or celebratory language.

### Emotional Design Principles

1. **Calm is not emptiness.** Reduce noise while retaining the detail required for a confident decision.
2. **Confidence comes from explanation.** Never substitute visual polish for evidence or reasoning.
3. **Urgency must be earned.** Strong color, placement, and interruption are reserved for genuinely time-sensitive action.
4. **Consequential work deserves dignity.** Avoid gamification and punitive visual language.
5. **Automation should reduce anxiety, not agency.** Show what happened and preserve user control.
6. **Failure should narrow uncertainty.** Every error or unresolved state provides a recovery path.
7. **Expression belongs where it helps.** Marketing may be visually expansive; critical product tasks remain direct and stable.
8. **The product should feel more useful on return.** Preserve context, history, drafts, and changes so repeated use builds trust.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

#### Miro — product-wide composition and confidence

Miro contributes modular, tile-based composition; strong scale changes between page, section, and object; confident product demonstrations; grouping through space and surface; progressive disclosure; and a recognizable rhythm across marketing and product contexts.

Missa adopts Miro's compositional confidence, not its yellow palette, Roobert typography, universal pill buttons, oversized corner radii, or whiteboard-specific interaction model.

#### Chillsubs — opportunity discovery and disclosure

Chillsubs contributes opportunity-first browsing, approachable filters and comparison, progressive disclosure from tile to record, visible submission facts, and organization-to-opportunity exploration.

Missa goes further by separating directory evidence from official destinations, modeling organizations and programs accurately, exposing uncertainty, supporting more opportunity types, and connecting discovery to preparation and tracking.

#### Linear — operational precision

Linear contributes compact scanning, keyboard-supported navigation, predictable action placement, restrained hierarchy, context-preserving inspectors, and fast visible state transitions. These patterns apply primarily to organization administration, submissions, review, decisions, and platform operations. Missa does not inherit Linear's dark-first developer aesthetic or assume that every user is a daily power user.

#### Notion — approachable structured content

Notion contributes readable hierarchy, calm white surfaces, approachable structured content, and progressive disclosure with restrained chrome. These patterns support creator preparation, work records, profiles, and lower-frequency organization setup without turning structured workflows into unconstrained documents.

#### Sanity — structured content and provenance discipline

Sanity contributes separation between structured fields and presentation, visible technical metadata where appropriate, focused editing surfaces, validation, inspectors, and publication readiness. These patterns support opportunity-quality operations, evidence review, taxonomy, organization records, and publication governance.

### Transferable UX Patterns

#### Navigation

- Persistent product context with an explicit creator/organization switch.
- Stable object identity and breadcrumb/return state across surfaces.
- Spacious public, calm creator, and compact operational navigation built from one semantic model.
- Command search as an operational enhancement, never the only access path.

#### Interaction

- Miro-style modular composition for pages and dashboards.
- Chillsubs-style scan-to-detail progression expanded into evidence-backed disclosure.
- Linear-style list-plus-inspector workflows for review and administration.
- Notion-style approachable structured editing for preparation and setup.
- Sanity-style validation, provenance, and publication readiness.
- Optimistic feedback only when the action has a safe deterministic commitment boundary.

#### Visual

- True-white canvas with confident changes in scale.
- Content-led tiles rather than decorative card collections.
- Aubergine as Missa's disciplined action and focus color.
- Miro-inspired rhythm and confidence without importing its brand palette.
- Density expressed through spacing and composition, not illegibly small text.
- Image-free layouts as the baseline; media enhances identity only when a trustworthy asset exists.

### Anti-Patterns to Avoid

- Copying a reference's colors, fonts, radii, or branded gestures without its product rationale.
- Applying pill controls and large rounded cards to every object.
- Treating a dashboard grid as proof of a coherent product.
- Building different components for the same object on every route.
- Hiding core detail behind excessive disclosure.
- Compressing operational screens by removing labels, evidence, or focus visibility.
- Using decorative imagery when the organization or opportunity has no trustworthy asset.
- Showing crawling directories as official destinations.
- Making every recommendation, status, or confidence value a colorful badge.
- Assuming keyboard-heavy power-user behavior for occasional reviewers or first-time administrators.
- Turning creator preparation into an unstructured document editor.
- Allowing visual redesign to silently rewrite permissions, workflow rules, or authoritative data.

### Design Inspiration Strategy

**Adopt:** Miro's modularity, scale, rhythm, and product-wide confidence; Linear's operational scanning, inspectors, and command efficiency; Notion's calm structured-content treatment; Sanity's validation and provenance discipline; and Chillsubs' opportunity-centered discovery and layered disclosure.

**Adapt:** tiles into Missa object summaries with stable anatomy and evidence states; pastel feature differentiation into restrained semantic or editorial emphasis; dense tables into responsive structured lists and inspectors; opportunity disclosure into an organization → program → opportunity model; and product demonstrations into connected Missa workflows rather than decorative mockups.

**Reject:** Miro's literal palette, typography, universal pills, and whiteboard mechanics; generic SaaS card grids disconnected from workflow; dark-first operational styling; decorative or generated imagery without object authority; bare scores, unexplained automation, and source-obscuring links; and separate visual identities for public, creator, and organization surfaces.

## Design System Foundation

### 1.1 Design System Choice

Missa will use a custom semantic design system built on the existing Base UI/shadcn and Tailwind foundation. Accessible third-party primitives provide interaction mechanics; Missa owns the identity, visual language, component anatomy, product semantics, responsive behavior, evidence states, density modes, and content contracts.

The product will conduct a genuine visual-identity reset. Existing typography, color, radius, iconography, and surface treatments are historical inputs and a baseline comparator. None is automatically retained. Product semantics, accessibility requirements, evidence states, object identity, authorization, and interaction contracts remain binding.

The system has five governed layers:

1. primitive tokens;
2. semantic tokens;
3. component tokens and stable anatomy;
4. density and composition modes;
5. product patterns and canonical view models.

### Rationale for Selection

- Missa already has a substantial React component estate and accessible primitive foundation.
- The product requires greater semantic control than a generic enterprise system provides.
- Rebuilding primitives would add accessibility and maintenance risk without improving product meaning.
- A theme applied to current routes would preserve inconsistent anatomy and workflow behavior.
- Literal Miro adoption would conflict with Missa's information density, status semantics, evidence model, and operational requirements.
- Layered tokens allow expressive intensity and density to vary without forking meaning or components.
- A normalized view-model layer supports gradual migration and rollback while legacy surfaces remain operational.

### Visual Identity Territories

At least three complete systems will be explored:

1. **Signal & Structure** — precise contemporary grotesk, assertive editorial scale, warm neutral canvas, mineral ink, and one vivid signal color supported by restrained semantics.
2. **Living Editorial** — characterful display face paired with a disciplined interface sans, cultured neutrals, deep ink, and restrained authoritative accents.
3. **Clear Horizon** — humanist sans system, luminous surfaces, a deep anchoring brand color, and a brighter secondary signal used sparingly.

The current system remains a fourth baseline comparator. Directions are complete systems, not moodboards or isolated swatches.

Each system defines:

- display, interface, metadata, numeric, and source/code typography;
- type scale, weight, line height, measure, wrapping, emphasis, and responsive behavior;
- canvas, surfaces, ink, borders, actions, focus, selection, disabled, and interaction states;
- success, warning, destructive, informational, verified, source-reported, inferred, inherited, conflicting, stale, unknown, closed, and unavailable states;
- geometry, iconography, imagery, density, and motion;
- forced-colors behavior and any proposed dark theme.

### Visual-Foundation Gate

No product-wide visual implementation begins until complete identity territories are tested on identical connected workflows and stress-content fixtures. One system is selected through weighted evidence, documented tradeoffs, and an explicit decision record.

The comparison uses the same opportunity across:

- public homepage and catalogue;
- opportunity detail;
- Creator Tracker and preparation;
- organization call editor and submissions;
- reviewer workspace;
- administrative evidence review;
- mobile discovery → detail → save → official handoff → Tracker return;
- failure and uncertain-outcome recovery.

Stress fixtures include long and multilingual names, no image or logo, missing facts, multiple calls per program, tiered fees and currencies, conflicting evidence, dense tables, validation errors, destructive actions, font failure, 200% text zoom, 400% browser zoom, narrow mobile, reduced motion, high contrast, forced colors, grayscale, color-vision deficiencies, loading, partial data, offline drafts, and failed mutations.

Evaluation weighting:

- 25% comprehension and hierarchy across densities;
- 20% accessibility and text legibility;
- 15% semantic-state and evidence clarity;
- 15% recognizable Missa identity;
- 10% continuity across public and authenticated surfaces;
- 10% implementation and maintenance durability;
- 5% expressive range for marketing.

Reject any system that depends on decorative imagery, loses clarity in compact operations, uses color as the sole carrier of meaning, reduces long-form readability, makes evidence ambiguous, or cannot meet performance and accessibility budgets.

### Typography Contract

- Select type by content role rather than fashion.
- Body and interface text remain highly legible at 16px equivalent; compact operational text may reach 14px only with compliant line height, contrast, zoom, and target behavior.
- Test ambiguous glyphs, punctuation, URLs, emails, currencies, dates, international names, diacritics, and language coverage.
- Define tabular numerals, italics, emphasis, ligature policy, responsive measures, loading, fallback metrics, licensing, and failure behavior.
- Variable-font axes and allowed instances are centrally governed; routes cannot improvise them.
- Essential text survives 200% text zoom and 400% browser zoom without overlap, clipping, or inappropriate two-dimensional scrolling.

### Color and Evidence Contract

- Begin with semantic roles and required contrast relationships, not brand swatches.
- Tokens distinguish brand expression, interface structure, action, focus, selection, semantic feedback, evidence quality, and data visualization. A color cannot serve conflicting meanings.
- Normal text meets at least 4.5:1; large text, meaningful boundaries, focus, and semantic graphics meet at least 3:1. Dense muted text aims above the minimum.
- Every foreground token declares its valid surfaces.
- Color reinforces but never solely communicates state. Evidence uses stable anatomy: label, explanation, source, freshness, and disclosure.
- Links, hover, focus, selected, pressed, disabled, loading, and error states remain distinguishable in grayscale and common color-vision simulations.
- Taxonomy and programs do not receive arbitrary identity colors.
- Dark mode is not promised by token inversion; if pursued, it requires separate semantic validation.

### Implementation Approach

1. Audit existing tokens, primitives, composites, and route-local styling.
2. Freeze entity boundaries, semantic states, capability vocabulary, responsive tiers, and canonical component anatomy.
3. Create the visual territories and identical stress fixtures.
4. Select and record the winning system at the visual-foundation gate.
5. Establish shared layout primitives: Stack, Cluster, Grid, Page, Section, Rail, Split View, and Inspector.
6. Stabilize accessible interaction primitives and complete states.
7. Define canonical object components using normalized view models rather than route payloads.
8. Build a deterministic component workshop.
9. Validate the two connected reference journeys.
10. Migrate connected workflows through shared tokens and canonical components, then retire legacy variants after parity evidence.

### Governance

- Routes cannot introduce raw color, font, spacing, radius, opacity, elevation, or motion values.
- Component variants require a named purpose, states, responsive contract, accessibility contract, and evidence that an existing variant cannot serve the need.
- Public, creator, organization, reviewer, and admin surfaces may vary scale, density, and expressive intensity but not semantic meaning, object anatomy, action hierarchy, or status treatment.
- Components consume canonical view models and capability contracts; visual hiding never substitutes for server authorization.
- Token linting, contrast checks, visual regression, accessibility review, component adoption, exception expiry, performance, and legacy retirement are measured.
- Automated checks are a floor; every component receives human review in realistic content and interaction states.

### Coss UI Reference and Adoption Boundary

Coss UI is an approved component and pattern reference. Its Base UI, React, Tailwind 4, and copy-and-own registry foundations align with Missa's existing stack. Its primitives → particles → atoms model also supports Missa's intended separation between accessible controls, composed interface patterns, and domain-connected workflows.

Coss does not become Missa's design system or product semantics. It remains early access, its complete primitive registry overlaps the existing `components/ui` estate, and its full `@coss/style` preset would install a neutral theme, sidebar variables, Inter, and Geist Mono before Missa's visual-foundation gate has selected typography and color.

Adoption rules:

- use the official documentation and `llms.txt` as implementation intelligence;
- evaluate selected primitives and particles in an isolated workshop before shared adoption;
- import source selectively after file-level diff, dependency review, accessibility validation, and API migration review;
- adapt selected pieces behind Missa-owned semantic components and canonical view models;
- preserve 44px touch targets on public and creator layouts even where Coss defaults are more compact;
- reserve compact variants for documented mouse/keyboard organization and admin contexts;
- do not use Coss badges or alert colors as a substitute for Missa's evidence-state anatomy;
- do not install `@coss/style` or `@coss/colors-neutral` into the main application until the selected visual direction explicitly adopts and remaps them;
- track every replacement, compatibility seam, and retirement in the component migration ledger.

Initial pilot candidates are Field, Fieldset, Form, Input Group, Number Field, Drawer, Sheet, Dialog, Alert Dialog, Select, Combobox, Autocomplete, Table, Toolbar, Pagination, Sidebar, Empty, Skeleton, Progress, Toast, Group, and Segmented Control. Card, Badge, and the complete style preset are intentionally excluded from the first pilot because they would prematurely bias the new identity and evidence language.

## 2. Core User Experience

### 2.1 Defining Experience

Missa helps creators decide whether an opportunity deserves their effort, prepare using what they already have, move safely into the official application process, and return to a reliable record of what happened.

The defining creator experience is:

> **Assess the fit → choose intentionally → prepare without starting over → complete the official process → reconcile the result → monitor changes → retain the history.**

Progress is not assumed. Confidently deciding not to pursue an opportunity is a successful outcome.

The organization experience is:

> **Define or select a program → create a versioned call → validate and preview its public truth → approve and publish → receive immutable submission snapshots → conduct reviews → reach authorized decisions → communicate and deliver outcomes → archive the cycle without erasing history.**

The product-wide principle is **one thread, bounded objects, explicit state**. The opportunity connects the journey, but programs, cycles, calls, requirements, preparations, submissions, reviews, decisions, communications, deliveries, destinations, and evidence remain distinct consequential records.

### 2.2 User Mental Model

Creators think in portfolios of possibility rather than isolated opportunities. They compare several calls against limited time, money, energy, and reusable work. They need to understand credibility, personal fit, effort, value, timing, disqualifiers, existing suitable work, missing materials, and what happened after leaving Missa.

Organizations manage recurring programs, published call cycles, applications, submissions, reviews, decisions, communications, and obligations. “Fischer Prize” may be durable opportunity identity while “Fischer Prize 2026” is a cycle with its own terms, judges, submissions, and outcomes. A future cycle must not rewrite what applicants saw previously.

Reviewers work primarily inside assigned submission cases governed by an exact call, requirement, criteria, anonymization, conflict, and submission version. Review completion and authorized decision remain distinct.

### 2.3 Success Criteria

- Creators can explain why an opportunity does or does not fit them.
- Creators understand effort, fee, missing materials, reusable work, and disqualifiers before committing.
- Opening an external destination is never represented as starting or completing a submission.
- External progress can be recorded in seconds without fabricating certainty.
- Changed information is summarized in terms of its impact on preparation or submission.
- Interrupted mobile work resumes at the same meaningful point.
- Reusable work, biographies, links, and supporting materials are not repeatedly re-entered.
- “Not pursuing” and “outcome unknown” are respected outcomes rather than failures.
- Organizations preview versioned public truth and understand the diff, validation, approval, effective time, affected people, notification consequence, and supersession path of later changes.
- Submissions preserve the exact call, requirements, questions, declarations, fees, and terms under which they were prepared and submitted.
- Review, recommendation, deliberation, decision, communication, delivery, and archival readiness remain independently understandable.
- Evidence correction never rewrites historical submissions, reviews, or decisions.

### 2.4 Novel UX Patterns

The creator-facing experience is the **Opportunity Path**: a stable opportunity connected to the creator's decision, materials, actions, handoffs, changes, and outcome.

The product-wide pattern is the **Living Opportunity Thread**: a stable opportunity identity connected to dated cycles, publishable call terms, first-party destinations, field-level evidence, and role-owned workflow records. Missa preserves continuity through purposeful views of this connected thread rather than collapsing every fact and action into one record.

Durable opportunity identity and dated cycles are distinct. Each cycle owns deadlines, fees, awards, requirements, availability, destinations, judges, and publication history.

Organization, program, opportunity, cycle, call, requirement set, creator interest, preparation, submission, review, decision, communication, delivery, destination, and evidence claim remain independently addressable objects with explicit relationships, ownership, and history.

Opportunity lifecycle, creator relationship, submission progress, review progress, decision state, delivery state, and evidence quality use separate state machines. A generic status field cannot represent multiple domain concerns.

Every interface consumes a named canonical view model appropriate to its task, including `OpportunityIdentityView`, `OpportunitySummaryView`, `OpportunityEvaluationView`, `CreatorOpportunityContextView`, `CallPublicationView`, `SubmissionQueueItemView`, `ReviewWorkspaceView`, and `EvidenceInspectionView`.

### 2.5 Experience Mechanics

#### 1. Assess

Establish identity, active cycle, credibility, eligibility, effort, value, timing, evidence quality, personal fit, and likely disqualifiers. Recognition works without imagery and distinguishes organization, program, durable opportunity, and current cycle.

#### 2. Decide

Support pursue, maybe, not for me, and revisit-later decisions. Recommendations explain their basis without becoming verdicts. A creator may record private notes and compare concurrent opportunities.

#### 3. Prepare

Map versioned requirements to existing Work and reusable profile materials. Identify satisfied, missing, adaptable, ambiguous, and externally completed items. Editing a source Work never silently mutates submitted snapshots.

#### 4. Handoff

Name the first-party destination and explain why the creator is leaving Missa. Preserve filters, scroll, disclosure section, selected work, drafts, notes, and an explicit return path. Navigation does not imply application progress.

#### 5. Reconcile

After an external handoff, ask what happened using lightweight choices such as submitted, started but unfinished, unavailable, information differed, decided not to apply, or remind later. Creator-attested progress remains distinct from system- or organization-confirmed submission state.

#### 6. Monitor

Surface material changes, approaching deadlines, unresolved requirements, and expected outcome windows without manufactured urgency. Explain what changed, source, time, evidence condition, personal consequence, and required action.

#### 7. Remember

Preserve decisions, materials, confirmation, notes, changes, and outcomes so every opportunity leaves the creator better organized, including when they do not apply or never receive a response.

#### 8. Publish and operate

Organizations manage Organization → Program → Call cycles → Versions → Submission cases and outcomes. A call progresses through distinct lifecycle stages such as draft, internal review, approved, scheduled, open, paused, closed, under review, decided, delivering, and archived.

Requirements have stable identity, wording, type, validation, visibility, effective version, provenance, and inheritance state. Published changes distinguish non-material corrections, applicant-visible updates, material rule changes, extensions, suspensions, and closure.

#### 9. Review and decide

Review workspaces preserve submission snapshot, criteria version, anonymization, conflicts, assignment state, scoring, notes visibility, autosave, calibration, and prior-round context. Reviews, recommendations, deliberations, and final decisions remain distinct.

Decisions record authority, rationale rules, effective state, internal and applicant-visible explanation, approval or quorum, embargo, communication state, reversal history, and delivery obligations.

#### 10. Complete bounded journeys

A creator journey may end in dismissal, saving, preparation, submission, withdrawal, selection, non-selection, or unknown outcome. An operational journey may complete intake, review, decision, communication, delivery, or archival readiness independently. These outcomes belong to their respective records and do not redefine opportunity identity.

### Identity, State, and Action Contracts

- The opportunity remains a recognizable anchor while each surface presents its bounded object and workflow state.
- A submission preserves the exact call and requirement version under which it was made.
- Review and decision views link to immutable submission context.
- Evidence inspection may correct resolved public facts without rewriting historical consequential records.
- Every action declares actor, active role, target, capability, preconditions, authoritative executor, resulting state, reversibility, audit behavior, and recovery path.
- “Next action” is derived from role, capability, object state, relationship state, and destination availability; it is not stored as a mutable opportunity property.
- Context switching never leaks applicant identities, internal notes, conflicts, or privileged actions.
- Consequential histories distinguish user action, automation, imported evidence, and operator correction.

## Visual Design Foundation

### Color System

The product will not approve a palette from isolated swatches. Each identity territory defines and demonstrates canvas and layered surfaces; ink hierarchy; brand signals; actions and links; focus and selection; meaningful boundaries; semantic feedback; evidence quality; interaction states; data visualization; forced-colors behavior; and any proposed dark theme.

The palette expresses possibility and forward movement without playful noise. High-chroma color remains scarce enough to preserve the meaning of action, focus, conflict, and urgency.

Opportunity types, disciplines, programs, and organizations do not receive arbitrary colors. Their identity remains explicit through text, hierarchy, iconography, and relationships.

Every foreground token declares the surfaces on which it may appear. Contrast is approved in real components rather than theoretical color pairs.

### Typography System

Typography remains a candidate system rather than a predetermined font choice. Each territory specifies display; page and section headings; interface and body; compact operational text; metadata and evidence; numerals and tabular data; identifiers and sources; emphasis; responsive scale; wrapping; language coverage; loading; fallbacks; licensing; and performance.

The type system remains related as it moves from an expressive public opportunity title to a compact submission row. It cannot become a display face plus an unrelated utility font with no shared character.

Baseline requirements:

- 16px-equivalent body and explanatory text;
- 14px compact operational text only where readability remains strong;
- tabular numerals for deadlines, fees, counts, scores, and financial data;
- clear ambiguous glyphs;
- international names, punctuation, currencies, and diacritics;
- governed variable-font axes;
- stable layout during loading and fallback;
- no essential meaning communicated by weight alone;
- support for 200% text zoom and 400% browser zoom.

### Spacing & Layout Foundation

The foundation retains a rational spacing system but does not automatically preserve current values. Each territory defines primitive spacing; inset, stack, inline, and gap relationships; public, creator, and operational density modes; responsive gutters; content measures; grids; split views; inspectors; sticky regions; safe areas; container-query rules; and mobile reflow priorities.

Shared laws:

1. Internal relationships are tighter than external relationships.
2. Space between groups is materially larger than space within groups.
3. Density changes spacing and composition, not semantic detail or legibility.
4. Components break when content stops fitting, not at arbitrary device labels.
5. A page uses a small repeatable set of alignment anchors.
6. Images are enhancements; layout remains complete without them.

Miro contributes bolder scale changes, larger compositional groupings, and confident modular layouts. Missa does not inherit universal pills, excessive rounding, or grids that turn every object into a floating card.

### Accessibility Considerations

Every visual territory passes the same matrix before preference testing:

- normal and large-text contrast;
- control, icon, focus, selection, and boundary contrast;
- keyboard operation and visible focus;
- screen-reader order, names, landmarks, and state;
- grayscale and common color-vision deficiencies;
- forced colors and high contrast;
- reduced motion;
- smallest supported mobile viewport;
- 200% text zoom and 400% browser zoom;
- font-loading failure and substitution;
- long and multilingual content;
- dense tables;
- missing information;
- conflicting evidence;
- validation and uncertain mutation outcomes;
- 44×44 touch targets for primary mobile interactions.

Color never carries meaning alone. Evidence conditions use label, explanation, source, freshness, and disclosure. Reduced motion removes spatial travel, parallax, pulsing, and loops rather than merely shortening them.

### Foundation Candidates

The visual exploration compares:

- **Signal & Structure**;
- **Living Editorial**;
- **Clear Horizon**;
- **Current Missa baseline**.

Each is rendered as a complete responsive system against identical connected workflows and stress fixtures. Exact fonts, colors, geometry, iconography, and motion are selected only after comparison.
