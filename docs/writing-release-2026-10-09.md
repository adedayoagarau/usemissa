# Writing workspace release — 9 October 2026

This release extends the real authenticated `/doc` page and incorporates main's shared-component migration (`d7318770d`). The original dirty checkout remains untouched; the release candidate is `codex/doc-release`.

## Included behavior

- Contextual selection and object actions, rich document essentials, outline/commands/bookmarks, research links, citations and material exclusions.
- Lock in retains the existing timer pattern. Listening starts from an icon in the selection toolbar; voice and playback controls use the existing compact player.
- Harper regional settings, personal dictionary and private comments/suggestions/cuttings now have typed, account-owned persistence with revision checks. Device/account conflicts retain both copies and expose recovery only when needed. Closing the panel flushes edits.
- Automatic/named history, comparison and restoration as a separate copy. Suggested insertions/deletions and clean reading views preserve original content.
- Downloaded projects reopen through `/doc` offline after restarting the browser. Only anonymous application assets are cached. Offline edits become separate recovered pieces; browser storage remains evictable.
- Project backup verifies account revision notes even on a second device. Different or unavailable copies block a falsely complete backup and provide recovery guidance.
- DOCX/EPUB export, rich import and project restoration, optional writing/revision sessions and milestones.
- Drive and Zotero integration code and account-encrypted storage. Live provider setup and acceptance are tracked separately below.

## Component contract

Actions use installed Button; settings use approved selection controls; disclosure uses installed Sheet, Dialog and Popover. `WritingToolSyncStatus` is the semantic feedback wrapper registered in the policy/catalogue, with concise status and conditional retry/backup controls. Existing typography and semantic color tokens are retained. Mobile/zoom fixes wrap existing controls rather than adding a new visual system.

## Validation

The combined writing browser suite initially passed 46 of 49 cases. Three test integration issues (ambiguous status selector, recovery-envelope fixture selection and settled resize geometry) were corrected; all 12 affected preference/revision/Zotero cases passed on rerun. Four further cross-device/recovery cases passed, covering independent browser contexts, immediate panel closure, overlapping responses and conflicting offline edits. Focused backup tests passed (4).

The full web unit suite passed 1,061 cases with 49 database-dependent skips and one boundary-test allowlist failure; registering the new tool repository test fixed that failure, and all three boundary tests passed on rerun. Separately, all 25 real disposable PostgreSQL writing/studio/connection/tool-record tests passed. Mobile 390px, 200% zoom, keyboard and reduced-motion checks cover relevant editor/integration controls. Chromium and WebKit touch emulation verify selection-only listening payloads.

Complex DOCX was rendered and inspected with LibreOffice, including multi-page tables and footnotes. Actual browser print projection preserves author formatting, omits private panels/deletions, includes proposed insertions and prints consistently from dark/light themes. See `writing-export-validation-2026-10-09.md`.

Normal `/doc` reopening also passed three complete browser runs after the actual origin was disconnected before restarting Chromium. The test uses real connection loss because browser offline emulation can leave worker fetches online. Rich editing/reload, separate recovery copies, account isolation, storage-failure backup and accessibility passed.

## Release gates and evidence boundaries

Migration 0101 was applied previously. Authorized additive migrations 0102 and 0103 committed to the shared Preview/Production database at 2026-10-09T11:19:54.335Z. Verification found four tables, 22 columns, 16 validated constraints and five indexes. Existing writing was not rewritten. Evidence: `doc-progress-2026-10-08/migration-0102-0103-verification.json`.

The fresh production build, full ESLint, design-system/language checks and migration parity checks passed. Merge and deployment outcomes remain separate from these checks.

Google Cloud access setup awaits the separate browser-required confirmation; Drive remains unavailable until its explicit environment configuration and real consent succeed. Zotero requires a user's read-only personal-library key; no real library key was provided. Mocked provider tests do not establish live provider acceptance.

Physical iOS/Android selection handles and Microsoft Word rendering are not certified by emulation or LibreOffice. Screenplay starting guides do not provide professional screenplay pagination. Structural/formatting edits are direct edits rather than tracked prose suggestions. These boundaries are not hidden by a claim that every possible writing feature is finished.
