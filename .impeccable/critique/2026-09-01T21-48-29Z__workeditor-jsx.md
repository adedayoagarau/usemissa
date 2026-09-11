---
target: Work editor
total_score: 18
p0_count: 0
p1_count: 3
timestamp: 2026-09-01T21-48-29Z
slug: workeditor-jsx
---
## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2 | Save and lifecycle labels are visible, but changes are instant and silent. |
| 2 | Match System / Real World | 3 | Artist language is strong; “public derivative” and “storage key” expose system language. |
| 3 | User Control and Freedom | 1 | Delete and archive lack undo, confirmation, or version recovery. |
| 4 | Consistency and Standards | 3 | Visual vocabulary is coherent, but Details opens Preview and preview actions are duplicated. |
| 5 | Error Prevention | 1 | Publish has no readiness gate for metadata, accessibility, URLs, or credits. |
| 6 | Recognition Rather Than Recall | 3 | Main functions are labeled; several icon-only controls and technical terms remain. |
| 7 | Flexibility and Efficiency | 1 | No shortcuts, undo/redo, direct drag reordering, duplication, or templates. |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained and credible, but three panes compete and mobile repeats view navigation. |
| 9 | Error Recovery | 0 | No error model or recovery path is represented. |
| 10 | Help and Documentation | 1 | Some inline hints, but no readiness guidance or contextual help. |
| **Total** | | **18/40** | **Poor: visually strong, operational safeguards incomplete** |

## Anti-Patterns Verdict

**LLM assessment:** Pass, with a category-reflex warning. The forest palette, compact geometry, typography, and familiar three-pane editor are credible. It avoids gradients, glass, giant decorative headings, excessive rounding, ornamental motion, and the abandoned purple system. The remaining risk is generic block-editor familiarity: Missa’s artist-first character is visible mainly in the artwork and preview, not in the act of composing.

**Deterministic scan:** Static scanning of `WorkEditor.jsx` returned zero findings. Rendered-page detection returned seven findings. Two are actionable: selected outline metadata text measures 4.0:1 instead of 4.5:1, and the public-derivative privacy explanation is only 11px. Five are contextual false positives: structural root padding, panel-header padding, intentional cover cropping, the single-font product system, and the contextual “Public Work draft” label.

**Visual overlays:** Injection succeeded in an isolated assessment tab, but that sub-agent could not present browser visibility. No reliable user-visible overlay remains. Console evidence and screenshots were used instead.

## Overall Impression

The editor looks mature enough to invite trust, but it currently makes promises its interaction model cannot keep. “All changes saved” is not durable recovery, “Published” is not the result of a readiness check, and several controls appear operational without persisting changes. The biggest opportunity is to make publishing feel as safe and intentional as the visual system feels calm.

## What’s Working

1. The restrained forest system is applied correctly: color communicates state and action while artwork carries expression.
2. The private-original versus public-copy boundary is surfaced, which is unusually thoughtful for an artist portfolio tool.
3. The outline, canvas, and contextual inspector form a learnable professional-editor structure. Mobile’s Outline/Edit/Preview reduction is directionally right.

## Priority Issues

### [P1] Publish is not a readiness decision

**Why it matters:** Artists can publish incomplete or inaccessible work. New media receives placeholder alt text as real content, gallery descriptions are not applied to public images, and captions or transcripts are fixture text.

**Fix:** Add a pre-publish review with blocking errors and warnings for title, cover, meaningful alt text, captions/transcripts, embed URLs, collaborator data, and explicit public-copy approval. Focus the first invalid field and preserve the draft.

**Suggested command:** `$impeccable harden`

### [P1] Destructive actions and save state lack a safety net

**Why it matters:** A portfolio project can represent hours of work. Delete, archive, and unpublish happen immediately, while “All changes saved” overstates local component state.

**Fix:** Add durable autosave with a last-saved time, unsaved-navigation protection, undo for block deletion, archive confirmation, and recoverable revisions.

**Suggested command:** `$impeccable harden`

### [P1] Accessibility fails in both controls and public output

**Why it matters:** Textareas miss shared font/focus treatment, several controls fall below 44px, state changes are not announced, selected outline metadata is only 4.0:1, critical privacy copy is 11px, and gallery alt text does not reach public images.

**Fix:** Extend the form/focus system to textarea, select, and range controls; enforce 44px targets; add live announcements; raise text contrast and size; correctly map authored descriptions into public media semantics.

**Suggested command:** `$impeccable audit`

### [P2] The editor contains semantic dead ends

**Why it matters:** Details opens Preview; Replace cover, Add collaborator, transcript, and embed controls look functional without reliably updating the model; the grip icon promises drag behavior that is absent.

**Fix:** Give metadata a real inspector state, connect or disable every visible control, persist block-specific fields, implement direct reordering, and remove misleading affordances.

**Suggested command:** `$impeccable clarify`

### [P2] Preview and mode navigation are duplicated

**Why it matters:** Desktop exposes three preview entries; mobile adds Outline/Edit/Preview plus Inspector/Preview and a fixed preview footer. The inspector-sized desktop rendering is too small to judge the actual page.

**Fix:** Create one preview mode that replaces the central canvas or opens the exact public route. Remove duplicate mobile tabs/footer while preview is active; keep device switching within that mode.

**Suggested command:** `$impeccable distill`

## Cognitive Load

Five of eight checks fail, which is high. Single focus, chunking, one-thing-at-a-time, minimal choices, and progressive disclosure fail. Grouping, hierarchy, and working-memory support pass. The clearest overload is the Add block decision with eight equally weighted options, followed by five metadata fields and three concurrent editing regions.

## Emotional Journey

The opening is reassuring and the editing pattern becomes understandable quickly. Confidence drops when controls reveal incomplete behavior. The highest-stakes moment, publishing, has the least reassurance. Preview is a good reward, but the miniature frame and absence of a public URL or “view live work” handoff weaken the ending.

## Persona Red Flags

**Alex, experienced portfolio builder:** Cannot drag or duplicate blocks, undo, use shortcuts, or reuse a project structure. Three preview entry points obscure the fastest path.

**Sam, keyboard and screen-reader user:** Textareas miss shared focus styling; controls are below target size; state changes are silent; gallery alt text is lost; publish does not block missing accessibility content.

**Casey, interrupted mobile artist:** Lifecycle actions remain at the top; two competing navigation systems consume space; durable autosave is unclear; sliders and reorder controls are difficult one-handed.

**Amara, multidisciplinary artist:** Eight formats are offered without discipline-aware guidance; collaboration appears supported but credits cannot be edited; the canvas emphasizes administration before sequencing and emotional pacing.

## Minor Observations

- Use sentence case for “Image block.”
- Replace “Public Work draft” with “Public draft,” or rely on the existing Draft status.
- Replace “Approved public derivative” with plainer language such as “Public copy approved.”
- Remove decorative browser chrome from the constrained preview.
- Support direct focal-point manipulation while retaining sliders as an accessible alternative.
- Do not treat the preview’s tiny text as evidence of real mobile accessibility.

## Questions to Consider

1. What must be true before Missa is willing to label a project Published?
2. Should the editor center sequence and emotional pacing while metadata moves into a quieter setup step?
3. Should Preview be a separate exact public destination instead of a miniature inspector state?
4. Why should writers, photographers, performers, and multidisciplinary artists begin with the same eight undifferentiated block choices?
5. Does “All changes saved” mean recovery after refresh? The interface should make only the promise the system can keep.
