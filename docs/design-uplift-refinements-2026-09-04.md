# Review refinements applied

- Women & Non-Binary collection: removed orbital symbol; expanded the Newsreader headline into a typography-led cover.
- Mobile collections: removed decorative motif columns and reduced gaps; maintained full collection identity.
- OpportunityBrowseProjectCard: removed generic stock-photo fallback library. Missing or failed identity images produce a compact organization-name panel; the body does not repeat that organization name. Available identity images remain. Save and calendar actions remain shared.
- Directory: removed generic summary filler; real descriptions and logos remain.

## Read-only duplicate audit

Exclamation Mark Lit is represented by two distinct gary_profiles rows, each with one latest profile page and one intelligence row. Both have the same name, website and latest source-detail URL. Canonical keys differ:

- profile_ca95e75851645fe5f615beca00affba0: profile:literary_magazine:exclamation mark lit
- profile_c1d7de6ff88c6b3a4b5d0f34a4dd3846: profile:literary_magazine:exclamationmarklit.com:exclamation mark lit

Website: https://exclamationmarklit.com
Source: https://www.pw.org/literary_magazines/exclamation_mark_lit_0

This supports a duplicate identity caused by two key formats, rather than a rendering duplicate. No database writes or record merges were performed. A merge must inspect dependent observations, pages, media and user relationships and preserve their references; hiding one card would leave counts and pagination inconsistent. The audit is complete; data consolidation remains separate from this visual change.

Validation: design-system checker, scoped ESLint and TypeScript; desktop and 390px visual checks. No generated image was needed for the typographic concept. Local changes only.
