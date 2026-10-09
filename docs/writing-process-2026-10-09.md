# Writing-process implementation audit — 9 October 2026

Scope: the owner's attached “fast editing, dependable ownership, whole writing process” checklist. Work extends the actual `/doc` editor, not the public concept site. Existing dirty work was retained. This is implementation and local QA evidence, not a production release claim.

For the current release candidate, cross-device persistence and normal `/doc` offline reopening, see [the release record](writing-release-2026-10-09.md). Earlier pass-by-pass deployment statements below are historical.

## Current migration status

Migration `0101_creator_writing_studio.sql` was explicitly authorized by the owner and committed to the shared Preview/Production database at 2026-10-09T09:51:22.308Z. Verified all three tables, 19 columns, 18 validated constraints and seven indexes. Existing writing was not rewritten or deleted. The production application was not redeployed. Earlier pending-migration notes below are historical and superseded by this result. Evidence: `doc-progress-2026-10-08/migration-0101-verification.json`. Temporary environment credentials were removed after verification.

## Audio status

Icon controls, selectable voices, quota enforcement and browser playback are implemented. The configured production Redis answered PONG and passed an atomic quota test; the shared cap is 60 million characters. DeepInfra's sensitive key is enabled for Production and Preview. Real Heart and Emma Kokoro playback, completion, replay, pause/resume/stop passed through the hosted Preview editor using the owner’s confirmed desktop sign-in. Production deployment is still required. The owner's observed provider price is $0.99/million characters; older $0.62 estimates are superseded.

## Listening ranges and integrations continuation

The highlight toolbar now has an icon-only speaker action for selected text. It snapshots that passage on click through the existing footer player. This supersedes the range selector from the previous iteration; that selector and its explanation were removed.

Google Drive and Zotero are implemented as explicit author-controlled actions using installed Missa components. Drive imports a selected file as a new piece and exports a DOCX copy. Zotero imports selected reference metadata into research; it does not change draft prose. These provider flows are not yet live-verified. Migration 0102 and provider configuration are separate from the completed 0101 migration above. See `writing-integrations-2026-10-09.md` for configuration and verification boundaries.

## Checklist and implementation

| Area | Added or verified | Remaining scope |
| --- | --- | --- |
| Selection | Small contextual formatting, published highlight, links, checklists, footnotes; More contains word count, copy plain text, checks, research and private comments. Optional in quiet/Lock in. | Mobile native selection-handle interaction needs physical-device certification. |
| Context | Contextual text/link/heading/image/binder actions, stable section links, draft section folding, atomic section moves with undo, validated local image replacement and relative widths. Visible alternatives and native Shift-right-click remain available. | Section moves stay within one editor; physical mobile native-selection interaction remains a certification item. |
| Offline | Explicit project downloads and device management; dedicated offline surface reuses WritingPages, caches only anonymous code/fonts, reopens after browser restart, searches and creates rich recovered copies. Original rich documents remain intact. | Normal `/doc` offline reopening is included in the release candidate. Offline ordering remains local rather than an account binder update. |
| Document essentials | Tables, local images with alt/caption, links, checklists, heading styles, semantic numbered footnotes and existing page numbering/formatting. | Cross-application rendering and complex table/footnote pagination need wider validation. |
| Navigation | Searchable commands, collapsible heading outline, bookmarks, recent locations, keyboard focus and scoped persistence. | Piece and stable section links now have a picker and automatic backlinks. |
| Revision | Explicit insertion/deletion/replacement suggestions, before/after and inline difference, accept/reject, clean original, private Verify/Revisit/Keep marks, unresolved navigation and rich cuttings saved before destructive acceptance. | Opt-in typing, paste and deletion tracking now persists through save/reload. Structural/formatting edits remain direct edits and are identified as such. Anchors conservatively refuse changed text. |
| Research | Source-linked passage backlinks, project notes beside draft, semantic footnote insertion, safe internal piece URLs, research-material exclusion from manuscript compilation/checkpoints. | Automatic piece/heading backlinks and local Citation.js APA/Harvard previews added; structured names/dates validated without external source fetches. |
| Checks | Regional English, per-piece rules, personal dictionary, persistent ignored wording and active-selection-only checking. | Typed account sync for preferences, dictionary and private revision notes is included in the release candidate, with both-copy conflict recovery. |
| Reading | Existing page spacing/margins/typefaces, quiet/focus views, keyboard navigation; read-aloud UI and tiered backend. | Hosted Preview provider playback is verified; production release remains separate. |
| Motivation | Optional weekly intention, rest days, timed writing or revision sessions, personal calendar/history and author-marked milestones. | Opt-in milestone feedback uses installed Sonner and respects reduced motion; competitive scoring is omitted. |
| Portability | Rich DOCX allowlist import, export reading-order preview and explicit formatting warnings, DOCX/EPUB task/caption/footnote support, whole-project JSON backup. | Transactional, idempotent project restore creates separate IDs, remaps links, and retains research/revision metadata. EPUBCheck 5.4.0 reports no errors/warnings; DOCX XML and Mammoth round-trip pass. Desktop Word visual pagination is not certified. |
| Modes | Essay, report, fiction, screenplay, poetry and everyday starting guides create new pieces in the same editor. | Screenplay guide is not professional screenplay pagination. |

## Revision history

The existing account snapshot service now powers dated automatic history, named versions, a named-only filter, renaming, comparison, and restore-as-a-copy. Original work remains untouched. Per-piece locking protects 100 named versions and retains the latest 100 automatic versions. The real account/browser test verified two automatic versions, naming/filtering/comparison, separate-copy restoration, long names, 390px and 200% reflow, keyboard focus, reduced motion and Axe AA. No additional migration is required for history.

## Component and source contract

Actions use installed Button/ButtonGroup, disclosure uses Popover/Sheet, selection uses NativeSelect/Checkbox, navigation uses Command and Collapsible, feedback uses Alert and status text. `WritingSelectionMenu`, `WritingNavigation`, `WritingRevisionTools`, `WritingPractice` and `WritingOfflineProject` are registered in the policy and catalogue. Tiptap's official BubbleMenu plugin supplies selection positioning. The offline bundle is generated from canonical editor components and CSS; only its generated vendor assets are exempted from source-style scans.

Research references were checked separately from repository evidence:
- https://www.notion.com/help/writing-and-editing-basics — contextual editing and block actions.
- https://support.google.com/docs/answer/6033474?hl=en — author-controlled suggested edits.
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria — device storage and eviction limits.
- https://help.ulysses.app/the-dashboard/goals — chosen writing days, intentions and session history.
- https://tiptap.dev/docs/editor/api/commands/selection/focus — editor focus and position navigation.

## Evidence

Focused tests cover selection persistence, rich import/export, grammar preferences and selection offsets, explicit suggestions and undo, rich cuttings and storage failure, navigation and bookmarks, sessions and new-piece templates, and browser restart with network disabled. Desktop and 390px/200% responsive checks, reduced motion and keyboard interactions are included where applicable.

The writing unit suite passed 119 tests with 17 database-dependent skips. Separate disposable-database runs passed 11 writing repository tests and 8 studio tests (including two schema tests). The first studio invocation was rejected by its database-name safety guard; rerunning against the existing dedicated studio QA database passed. No production database was used.

Integration checks found and repaired selection-toolbar access before editor mounting. The checks-selection browser fixture also incorrectly relied on a platform shortcut that left the caret at the end; it now establishes and verifies the actual selection before testing its preservation and mapped correction. Navigation waits for the saved heading to load and explicitly focuses the command input. Final build and browser results follow below.

- Final combined Chromium run: **14/14 passed** (navigation, sessions, Harper preferences/selection checks, rich DOCX import/export, revision and rich editor), 31.1 seconds. Toolbar dismissal and Cmd/Ctrl+A reopening are included at 390px and 200% zoom.
- Design-system policy, changed product language and `git diff --check`: passed.
- Fresh production build, including generated offline rich-editor assets, followed by TypeScript: passed. This is build evidence only; the production site was not deployed.
- Rebuilt offline bundle: browser restart with networking disabled, rich table/bold/image preservation, separate queued copies, create/rename/search/reload, storage-failure backup, narrow cache, account isolation, Axe accessibility, keyboard/reduced motion and 390px/200% reflow all passed.

No production database migration, remote push or deployment was performed in this pass. Migration 0101 remains a deployment prerequisite for project studios and reader feedback.

## Completion verification (continuation)

- Writing unit run: 166 total; 146 passed, 20 database-dependent skipped, zero failed. Separate live disposable-database repository run: 14 passed, including research totals and concurrent named-version capacity. Studio repository previously passed 8.
- All 22 new-feature Chromium journeys passed in the combined run. All eight original-room failures passed on focused rerun after platform-correct keyboard navigation and settled-overlay checks. A real quiet-mode focus defect was repaired by keeping the context-menu wrapper mounted. All six rich-editor regressions then passed; no accessibility rules were disabled.
- TypeScript, design-system policy and changed product language passed.
- Published text, read-aloud, grammar mapping, manuscript totals, reader shares and exports omit tracked deletions; research stays private/excluded while account history retains the full document.
- Migration 0101 remains a release prerequisite for project studios/reader feedback. No production migration or deployment has been performed.

- Final production build and subsequent TypeScript check passed. The first final build caught an unsupported `disabled` prop on ContextMenuTrigger; it was moved to the installed Root API and rebuilt successfully.
- Final offline bundle again passed real browser restart with networking disabled, rich preservation, separate queued copies, storage-failure backup, account isolation, Axe, 390px/200%, keyboard and reduced-motion checks.
- Review fixed automatic history starting from an empty loading placeholder (regression test added) and remapped checkpoint-copy internal links to their new piece IDs.
- Hosted Kokoro verification: see `writing-read-aloud-2026-10-08.md` and the screenshot in the evidence directory. The audio feature works in Preview; this report does not claim a production release.

Final Preview: https://missa-q4uvthjvn-adedayoagarau.vercel.app/doc (Vercel READY, dpl_BnhaLEJo4WuGWRAukjDtsW2LqTGY). The source snapshot includes the final history baseline, checkpoint-link and quiet-mode fixes. No git commit/push or production app deployment occurred.

A read-only environment/database check confirmed Preview and Production resolve to the same database endpoint. All three migration0101 tables are absent. Approval was requested before altering that shared production database. Audio and per-piece history do not require this migration.

### Integration validation limits

Zotero desktop import and real Missa route authentication/origin checks passed. The 390px dialog has no horizontal overflow at 200% CSS zoom, but the underlying page retains horizontal overflow and vertical dialog behavior at that synthetic zoom is not certified. Keyboard browsing and reduced-motion mobile workflow passed. No live Zotero key or Google OAuth connection was used.
