# Release export validation — 2026-10-09

Evidence scope: `/Users/adedayoagarau/.codex/worktrees/doc-release/usemissa`. No production changes, provider configuration changes or commits were made by this validation task.

## DOCX and pagination

Microsoft Word is not installed. The bundled `soffice` is available and reports LibreOfficeDev 26.8.0.0.alpha0. A real generated DOCX was opened by that renderer and converted to PDF, rather than merely inspecting XML. This is LibreOffice evidence, not Microsoft Word visual certification; the development renderer and available fonts can differ from users' applications.

The fixture uses the manuscript preset (US Letter, double-spaced), eighteen long paragraphs, a 65-row table, repeating headers, seven native footnotes within table cells, a vertically merged cell, and a local PNG at 25% content width with a caption. LibreOffice produced nine tagged Letter pages. PDF text assertions confirm both cells of every row, all seven footnotes, merged-cell text, caption and final paragraph. Every page containing table body repeats the headers. Page 5 and page 9 were rendered to PNG and visually inspected: table and native footnotes fit inside margins, and the caption follows the correctly scaled image on its page.

Narrow pagination fixes keep headings with their following paragraph, keep figures with their captions, and enable widow/orphan control on exported paragraphs. The 15 export unit tests pass, including the generated vertical-merge continuation and footnote relationships. No unsupported layout feature was added.

Temporary inspectable artifacts: `/tmp/missa-release-export-qa/complex.docx`, `complex.pdf`, `complex.txt`, `table-page.png`, `figure-page.png`, plus the fixture generator. These temporary files are evidence artifacts, not application assets.

## Browser printing

A focused Chromium test against the actual `/doc` page on candidate port 3103 passed. Starting from Original review view, print media shows inserted proposed text, omits tracked deleted text, hides the open private revision panel, removes insertion decoration and preserves the writer's intentional underline. The editor JSON is unchanged after print-media projection. A dark-theme assertion confirms printed page foreground/background remain identical to the light printed page and use a light color scheme. The test lives in `apps/web/e2e/writing-export-print.spec.ts`.

Static checks also confirm editor folding is overridden by `print:block`, focus dimming becomes `print:text-foreground`, and the writing chrome is hidden. PDF conversion does not establish universal PDF/UA compliance or correct pagination in every browser and font environment.

## EPUB

The earlier official EPUBCheck 5.4.0 check reported zero errors or warnings for the complex EPUB fixture. This task changes only DOCX pagination properties; the EPUB generator is unchanged. See `docs/doc-progress-2026-10-08/export-restore-validation.md` for that evidence.

## Drive and Zotero setup audit

`docs/writing-integrations-2026-10-09.md` lists exact Drive OAuth/Picker variables, callback registration, narrow `drive.file` scope, API/referrer restrictions and migration 0102. Drive cannot operate until those settings are configured and real user consent succeeds. Zotero requires each user's validated read-only personal-library API key; there is no shared Zotero service key in the app. Both use the encrypted account/provider-bound database store.

Preview and Production sharing the database must share the same stable credential encryption key/version; a distinct Preview key requires an isolated database. No environment values were printed or changed. Real provider consent/import/export remains a separate deployment check; local mocks and generated files do not prove it.
