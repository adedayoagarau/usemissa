# Beta readiness — September 6

## Implemented

- Root route uses the reviewed knit-image homepage; primary navigation links to Opportunities, Rankings and Directory. Mobile menu exposes signup.
- Shared beta route gate permits signup, onboarding, Saved, Tracker, Library, Calendar and Inbox. Existing authenticated layouts still enforce login. No production deployment made.
- Onboarding completion and skip lead to Tracker instead of the organization workspace. Failed saves stay on the current step. Backend preference failures return an error rather than recording completion. Local compatibility storage remembers setup status.
- Existing ranking and directory implementations remain in use. Ranking tier colors and movement indicators share semantic components.
- Isolated Vercel preview payload includes relevant web changes and their package dependencies, excluding unrelated ingestion and welcome experimentation.

## Evidence

Production build passed before the final onboarding correction; latest deployment rebuild validates the final payload. Workspace typecheck and design-system checks pass. Seven local Playwright checks pass: signup/login, exact protected-page return path, onboarding error/retry and skip persistence, saved opportunity in private shortlist including accessibility audit, rankings desktop/mobile, production-route allowlist. Local tests use in-memory compatibility storage with provider email disabled; they do not prove Neon Auth or production database writes.

Full lint remains non-clean due existing failures including directory explicit-any annotations and methodology unescaped punctuation. The modified ranking methodology link uses Next Link.

## Database and account verification

The creator onboarding migration and creator relational migration have now been applied transactionally, plus the command receipt/audit dependency from 0030. The migration journal remains unchanged; see beta-ui-follow-up-2026-09-06.md for the repair boundary. Hosted signup succeeds and onboarding skip persists. Database tracker writes and reads pass. Preview storage authority is now explicitly PostgreSQL; final hosted account-route verification is ongoing.

## Remaining release checks

- Final rebuilt hosted account journey and production candidate verification.
- Physical iPhone check; Safari-engine tests are not physical-device evidence.
- Production domain promotion after the candidate passes.

## Hosted environment findings

The old preview had MISSA_CATALOGUE_DATABASE_URL but no DATABASE_URL, and its catalogue database lacked the rankings table. Preview DATABASE_URL now points to the existing working Missa database after read-only schema verification. Production secrets are redacted by Vercel; empty pulled secret values do not prove missing configuration. A production candidate uses the existing production configuration with creator relational authority enabled and skips domain promotion for verification. Hosted Safari-engine checks returned 200 for root, Opportunities, Directory, Rankings, comparison, methodology and signup, and opened both an opportunity detail and A Public Space's journal profile. No page overflow at iPhone viewport. Some prefetch requests were aborted during scripted full-page transitions; not recorded as a fully clean browser console.

Final UI follow-up also aligns comparison/methodology headers and shares ranking-tier badges with comparison and journal rank rows. Onboarding remembers completed/skipped state when reopened and uses the shared beta wordmark. Scoped lint has no errors; full legacy lint failures remain. Final hosted build status and URL are reported in the conversation.
