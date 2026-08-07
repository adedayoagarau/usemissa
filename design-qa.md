# Missa admin dashboard — Design QA gate

## Comparison target

- Source visual truth: selected Image Gen direction 3, “Operations queue,” at `/Users/adedayoagarau/.codex/generated_images/019fce4a-e0c7-79a3-aec9-4b42b4ca0832/exec-6b82e56d-6c14-4ed8-a0dd-c353d74a0f13.png` (1440 × 1024 px).
- Rendered implementation URL: `http://localhost:3002/admin` (local production render; intended production route is `https://www.usemissa.com/admin`).
- Implementation screenshot path: not captured. This session has no user-selected browser available, and the Product Design browser override does not permit an unrequested Playwright capture.
- Combined comparison input: not available.

## Capture normalization

- Intended comparison viewport: 1440 × 1024 CSS px, device scale factor 1.
- Source dimensions: 1440 × 1024 px. Implementation dimensions: unavailable because no screenshot was captured.
- Density normalization: not performed.

## State

- Intended state: authenticated platform administrator on the Operations queue route, populated backend read model, light theme.
- The implementation source was inspected in `apps/web/app/(admin)/admin/page.tsx`, `apps/web/app/(admin)/admin/operations/page.tsx`, `apps/web/components/platform-admin.tsx`, and `apps/web/lib/platformAdmin.ts`.

## Full-view and focused comparison evidence

- Full-view comparison: blocked because the browser-rendered implementation screenshot is missing; the selected source visual is available.
- Focused-region comparison: not performed; there is no normalized visual pair to inspect.

## Findings

- [P1] Visual fidelity comparison cannot be completed.
  Location: Missa platform admin Control Room and Operations routes.
  Evidence: the selected Image Gen direction is available, but there is no browser capture of the authenticated implementation in this session.
  Impact: approving a redesign would make the visual target implicit and could reproduce the current dashboard's density problems under a new skin.
  Fix: capture the implementation at the same viewport and authenticated state, then compare it with the selected direction.

### Required fidelity surfaces

- Fonts and typography: intended families and hierarchy are defined in `DESIGN.md`; visual fidelity is unverified.
- Spacing and layout rhythm: intended Workspace density is defined in `DESIGN.md`; visual fidelity is unverified.
- Colors and visual tokens: true white, semantic neutrals, terracotta action, and restrained state colors are defined in `DESIGN.md`; visual fidelity is unverified.
- Image quality and asset fidelity: no source visual assets are part of this admin target; visual fidelity is unverified.
- Copy and content: current admin vocabulary is visible in the route source; target hierarchy and task language remain unapproved.

## Comparison history

- Pass 0 — gate check: blocked after implementation. The source direction is selected, but no browser-rendered implementation screenshot was available for comparison.

## Implementation checklist

- [x] Generate and select an admin visual direction.
- [x] Implement the selected data-first operations-queue direction against the backend read model.
- [ ] Capture the selected source visual and authenticated implementation at 1440 × 1024, plus responsive states.
- [ ] Compare full view and focused regions together.
- [ ] Fix P0/P1/P2 findings and repeat the comparison.

final result: blocked

---

# Historical QA — Organization marketing page

## Comparison target

- Primary source visual: `/Users/adedayoagarau/.codex/generated_images/019fba3b-6c0b-7220-b862-b4c8d2b4ce28/exec-16b83cc8-b128-4d13-9ff6-687405382950.png` (selected Editorial Institution direction, 861 × 1827 px).
- Secondary reference: `/tmp/codex-remote-attachments/019fba3b-6c0b-7220-b862-b4c8d2b4ce28/95FEDFA1-B191-486F-8AC9-E041E2CC55D8/1-Pasted-Image-1.jpg` (CRM inspiration, 278 × 1280 px).
- Implementation: `/for-organizations`, rendered from the production server at `http://localhost:3002/for-organizations`.
- Combined comparison input: `/tmp/missa-org-design-qa/source-implementation-comparison.png`.
- Focused comparison input: `/tmp/missa-org-design-qa/focused-comparison.png`.

## Capture normalization

- Desktop viewport: 1440 × 1000 CSS px, device scale factor 1.
- Desktop implementation capture: `/tmp/missa-org-design-qa/org-desktop-prod.png`, 1440 × 5735 px, full page.
- Latest desktop implementation capture after the atmospheric gradient pass: `/tmp/missa-org-design-qa/org-desktop-gradient.png`.
- Mobile viewport: 390 × 844 CSS px, device scale factor 1.
- Mobile implementation capture: `/tmp/missa-org-design-qa/org-mobile-prod.png`, 390 × 7892 px, full page.
- Interaction captures: `/tmp/missa-org-design-qa/org-review-prod.png`, `/tmp/missa-org-design-qa/org-decisions-prod.png`, and `/tmp/missa-org-design-qa/org-faq-open-prod.png`.
- The source and implementation were resized only for the composite comparison; no density-based findings were filed. The source layout is a long marketing-page reference, not a pixel-identical viewport target.

## State and interactions

- Default light theme, unauthenticated organization visitor, desktop and mobile.
- Product showcase tabs switch between Public portal, Review workspace, and Decisions.
- FAQ rows use native expandable `details` states.
- Header and CTA links point to the existing login/signup, opportunities, and workspace routes.
- Desktop interaction smoke checks passed: Review workspace tab, Decisions tab, and first FAQ expansion.

## Full-view comparison evidence

The implementation preserves the selected direction's core composition: a strong Fraunces-led hero, real institutional photography, a submission preview layered over the image, a proof rail, product UI as the main evidence, workflow sections, a pricing/value explanation, FAQ, and a closing CTA. It also carries the CRM reference's progressive product-story rhythm (hero proof → product views → workflow → value → FAQ → CTA) without copying its CRM language, customer metrics, or purple/pink visual system.

The page remains true white with near-black type and restrained terracotta action color, matching `DESIGN.md`. The CRM reference's tinted atmosphere is used only as a restrained wash around product surfaces; it does not replace the white canvas.

## Focused-region comparison evidence

- Hero: headline scale, photo crop, overlay call card, CTA hierarchy, and terracotta halo were compared against the selected direction. The implementation uses a new generated gallery photograph with the same institutional/editorial intent and negative-space requirement.
- Product proof: the Public portal and Review workspace states were compared at the same section position. Both use readable product UI, not a screenshot pasted as a decorative image; the implementation has live tab state and realistic sample records.
- Responsive: the mobile capture confirms the hero, product preview, proof rail, three-step workflow, value cards, FAQ, CTA, and footer stack without horizontal overflow or clipped controls.

## Findings

No actionable P0, P1, or P2 mismatches remain.

### Required fidelity surfaces

- Fonts and typography: Fraunces is reserved for display statements and Instrument Sans/Fragment Mono handle UI, body, labels, and dates. Mobile headings wrap intentionally without clipping.
- Spacing and layout rhythm: 8px-derived spacing, hairline separators, restrained 6–14px radii, and generous section intervals hold at desktop and mobile widths.
- Colors and tokens: true white canvas, near-black ink, neutral borders, terracotta CTA/focus, green completion states, and amber review state match Missa semantic roles.
- Image quality and asset fidelity: the gallery image is a real generated asset at `/apps/web/public/media/missa-org-gallery.png`, rendered with `next/image`; no CSS or inline-SVG replacement is used for the hero image. Icons use the existing Lucide library.
- Copy and content: organization-specific copy is coherent and avoids unsupported customer logos, testimonials, savings percentages, or claims. Sample workflow data is clearly product UI content.
- Accessibility and states: semantic links, buttons, tab roles, native details disclosure, visible focus rings, descriptive image alt text, and reduced-motion handling are implemented.

## Comparison history

### Pass 1 — production render

- Evidence: `/tmp/missa-org-design-qa/org-desktop-prod.png` and `/tmp/missa-org-design-qa/org-mobile-prod.png` compared with the combined source input.
- Result: no P0/P1/P2 findings. The dev overlay seen during the first local preview was removed by validating the production render before comparison.
- Fixes: none required after the production capture.

### Pass 2 — atmospheric gradient refinement

- Earlier request: the hero felt too plain relative to the CRM inspiration's soft atmospheric field.
- Fix: added a localized peach/terracotta radial gradient behind the hero visual in `apps/web/app/for-organizations/org.module.css`. The gradient is clipped to the hero, uses Missa's restrained palette, and leaves the page canvas true white.
- Post-fix evidence: `/tmp/missa-org-design-qa/org-desktop-gradient.png` at the same 1440 × 1000 viewport. The gradient supports the hero/product relationship without reducing text contrast or changing section hierarchy.
- Result: no P0/P1/P2 findings introduced; the page remains passed.

## Follow-up polish (P3, non-blocking)

- The CRM reference includes testimonial and customer-proof sections. Missa intentionally leaves those out until real organization evidence is available; add them only with verified source material.
- The selected concept has a darker workflow band; the implementation keeps that sequence on white to stay aligned with Missa's true-white canvas rule.
- The new atmospheric gradient is intentionally softer and more localized than the reference's pink field so it does not turn the Missa canvas into paper or a tinted SaaS background.

## Implementation checklist

- [x] Dedicated `/for-organizations` page with separate organization register.
- [x] Homepage organization links route to the dedicated page.
- [x] Interactive product showcase tabs.
- [x] Native FAQ disclosure states.
- [x] Responsive desktop/mobile layout.
- [x] Production build, typecheck, and lint pass.
- [x] Full-view and focused source/implementation comparisons captured.

historical final result: passed
