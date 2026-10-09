# Writing project restore and export evidence

Local validation on the active working tree, 2026-10-08. This records local evidence, not deployment or production certification.

## Whole-project restore

The Library uses the installed Sheet, Button, Input, Field and Alert primitives. The intent is disclosure, file selection, preview, action and status. No new component variant was introduced.

Version 1 JSON backups include current rich documents, piece title/status/synopsis/cards, project plan, research sources and notes, structure and checkpoints. Device revision notes are copied locally and excluded from the account POST. A storage failure retains account data and offers the remapped recovery file. Reader share links are deliberately not recreated.

Restore creates a separate project and remaps piece/checkpoint IDs and internal document entry links. Account writes are one SQL transaction. Exact retries return the existing restored copy; conflicting IDs cannot overwrite documents. Input is bounded to 32 MB, with a 4 MB account request limit. Unsupported data that would be stripped is rejected instead of silently lost.

## Export interoperability

A generated complex EPUB containing Unicode, table header/cell spans, task items, linked footnotes and a local captioned PNG was checked with official EPUBCheck 5.4.0. Result: zero fatals, errors, warnings or infos. The checker ran locally with a temporary Adoptium Java 17 runtime. Primary tool documentation: https://w3c.github.io/epubcheck/docs/installation/.

All 17 generated DOCX XML and relationship parts passed local `xmllint --noout`. Unit tests verify OPC parts, archive bounds, metadata, whitespace, rich marks, lists, table spans, local image bytes, real footnotes and captions. Browser tests round-trip an actual generated DOCX through Mammoth and the allowlisted importer, checking headings, bold, lists, tables and inert script-looking text.

Microsoft Word and LibreOffice are unavailable on this machine; no claim of visual verification in those applications is made. DOCX import deliberately excludes images/resources and uses an inert, bounded structural conversion. Pixel layout, styles, comments and change tracking interoperability are not certified. Default exports use proposed reading: tracked deletions omitted, insertion markers removed; complete original marks remain in JSON backups. Internal Missa links become plain text and are reported in the export preview. EPUB keeps stable heading section IDs and relative image widths; DOCX scales images within the selected page preset. Plain text includes numbered footnotes and their text.
