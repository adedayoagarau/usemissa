---
target: Portfolio editor
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Volumes/Crucial X10/usemissa/src/PortfolioEditor.jsx"
timestamp: 2026-09-02T12-59-11Z
slug: src-portfolioeditor-jsx
---
⚠️ DEGRADED: single-context (subagents encountered API quota limit)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|:---:|---|
| 1 | Visibility of System Status | 2 | Untruthful "All changes saved" badge and instant unvalidated publish state without confirmation. |
| 2 | Match System / Real World | 3 | Composition names are clean, but "Make featured" and "Hidden" lack artist-first clarity. |
| 3 | User Control and Freedom | 2 | Missing "Edit Work" connection to Work Editor; "Add Work" is non-functional; no undo for reordering. |
| 4 | Consistency and Standards | 2 | False drag affordance (grip icon without drag-and-drop); missing Tablet viewport in preview. |
| 5 | Error Prevention | 2 | Allows publishing with 0 public works; no verification of required profile statement. |
| 6 | Recognition Rather Than Recall | 3 | MiniPreview is useful, but work cards omit discipline badges, focal crops, and readiness health. |
| 7 | Flexibility and Efficiency | 2 | No drag-and-drop work sequencing (relies only on step chevrons); no keyboard accelerators. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean 2-column layout, but preview column is squeezed on medium viewports. |
| 9 | Error Recovery | 2 | Empty preview state lacks actionable buttons to unhide or add works. |
| 10 | Help and Documentation | 3 | Contextual recommendation banner is good, but lacks guidance for hybrid discipline layouts. |
| **Total** | | **24/40** | **Acceptable: Core concept is clear, but lacks operational fidelity and Work Editor handshake** |

## Design Specificity Verdict

**LLM assessment**: Partial pass. The concept of 4 composition styles (*Editorial + Gallery*, *Gallery*, *Editorial*, *Showcase*) tailored to artist practices is strong. However, the component currently behaves as an isolated static mockup: drag handles are non-functional, saving is untruthful, and there is no live connection into the `<WorkEditor />` for editing individual works.

**Deterministic scan**: Deterministic CLI scan (`detect.mjs`) returned 0 findings across all 13 anti-pattern rules.

**Visual overlays**: Verified in browser. Chevron reorder targets are 28px (below the 44px floor) and preview lacks tablet framing.

## Overall Impression

`PortfolioEditor.jsx` has a clear information architecture and an effective recommendation system, but it lags behind the newly overhauled `WorkEditor.jsx` in terms of functional depth, accessibility, and truthfulness.

## What’s Working

1. **Smart Composition Recommendations**: The banner dynamically recommends *Editorial + Gallery* based on the creator's practice context.
2. **Live Side-by-Side Preview**: Real-time layout updates when switching between the 4 composition formats.
3. **Step-by-Step Framing**: "1 of 3", "2 of 3", "3 of 3" headings provide clear orientation.

## Priority Issues

### [P1] Missing "Edit Work" Handshake to `<WorkEditor />` & Non-Functional "Add Work"
- **Why it matters**: Creators cannot drill into individual works to edit blocks, alts, or metadata, breaking the authoring flow.
- **Fix**: Add an "Edit Work" action on each row linking to `<WorkEditor />`, and an "Add Work" creation modal.
- **Suggested command**: `/impeccable shape`

### [P1] Untruthful Saving & Instant Unverified Publishing
- **Why it matters**: Claims "All changes saved" without actual local persistence, and allows publishing empty or incomplete portfolios.
- **Fix**: Add debounced local persistence timestamps, a Pre-Publish Readiness gate, and a celebratory publish handoff banner.
- **Suggested command**: `/impeccable harden`

### [P1] False Drag-and-Drop Affordance
- **Why it matters**: Displays `IconGripVertical` suggesting drag-and-drop, but items cannot be dragged.
- **Fix**: Implement HTML5 drag-and-drop reordering with dragging/drag-over visual feedback and screen-reader announcements.
- **Suggested command**: `/impeccable polish`

### [P2] Missing Tablet Viewport & Small Touch Targets
- **Why it matters**: Preview only offers Desktop and Mobile; chevron buttons are 28px (violating 44px WCAG AA floor).
- **Fix**: Add Tablet viewport toggle and enforce 44px minimum targets on all interactive controls.
- **Suggested command**: `/impeccable adapt`

## Persona Red Flags

- **Alex (Power User)**: Frustrated by non-functional drag handles and lack of keyboard reordering.
- **Jordan (First-Timer)**: Confused when clicking a work row does not open the editor for that piece.
- **Sam (Screen Reader User)**: Visibility toggle and reorder buttons lack descriptive ARIA labels and live region announcements.
- **Casey (Mobile User)**: Preview column collapses below controls, requiring excessive scrolling.

## Minor Observations

- The recommended badge uses soft sage tones consistently with `DESIGN.md`.
- Summary list in Section 3 ("Review and publish") provides a quick readiness checklist.

## Questions to Consider

1. Should clicking a work row open `<WorkEditor />` directly, or should each row have explicit "Edit Work" and "View Details" actions?
2. Should we support custom composition ordering (e.g., custom section headings) or keep the 4 curated presets?
