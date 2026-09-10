# Homepage content review

7 September 2026. Copy review for the current Missa homepage pass.

## Brief

The homepage should sound like a person explaining Missa to a creator. It should make two things clear:

- Missa helps creators find open calls and other opportunities in one place.
- Creators can share their work through a portfolio.

The homepage does not make reminders, real-time notifications, deadline tracking or goal management part of its promise. Those controls remain in the existing workspace preview for product exploration; the surrounding marketing copy does not sell them.

## Review decisions

| Before | After | Reason |
| --- | --- | --- |
| Find opportunities. Build your portfolio, track applications and work toward your goals. | Find open calls, grants, residencies and places to share your work. | Names the useful things a visitor can do without adding product promises. |
| Find them on Missa. | Missa brings them together. | Reads as a clear answer to the problem in the heading. |
| Search ... without checking each website separately. | Browse residencies, grants, publications and prizes in one place. | Removes a long, defensive sentence. |
| Open opportunities | Current calls | Uses the word creators use for an application opportunity. |
| Explore organizations | Meet the organizations behind the calls | Explains why the directory is useful. |
| Make plans for your work. | Find the right call for your work. | Keeps the closing invitation tied to the homepage job. |
| Save opportunities. Track applications. Set your goals. | Browse calls for the work you want to make, then share it when you’re ready. | Removes features outside this page’s message. |
| Find opportunities and manage your applications. | Find calls. Share your work. | Short footer line with a human rhythm. |

The four live totals remain backend values. Their supporting lines now describe what each total represents in ordinary language. Category links still point to the matching filtered search; no opportunity title, organization name or count is invented in the copy pass.

The portfolio sample also had a grammatical error: “The train keeps a separate weather than the one outside.” It now reads “The train carries weather from one place to the next—condensing, clearing, changing as we move.” The sample is still labelled as fictional wherever it appears.

The footer now follows the supplied reference’s information hierarchy: a short Missa description, then separate columns for Calls, Explore, Your work, Tools & guides and Account, followed by a small legal row and the full-width painting. The links use the same filtered query helper as the category carousel, so a category link opens the matching opportunity search.

## Content rules for future homepage work

- Prefer “call” for something a creator can apply to and “opportunity” for the catalogue as a whole.
- Use a concrete verb and object: browse calls, share work, build a portfolio.
- Say an idea once. Remove an eyebrow or helper line when the heading already does the job.
- Keep data claims tied to the live catalogue and directory endpoints.
- Keep product previews labelled as previews or samples; do not imply that a click writes to an account.
- Do not add copy about reminders, deadline tracking, real-time notifications or goals unless the homepage brief explicitly changes.

## Validation

The changed strings were checked in their full section context at desktop, 390px mobile and 200% zoom. The homepage continuation tests remain the source of truth for live catalogue cards, loading and empty states, feature controls, FAQ keyboard use and no-account writes. Run the scoped homepage suite, ESLint and `npm run check:design-system` after any further copy change.
