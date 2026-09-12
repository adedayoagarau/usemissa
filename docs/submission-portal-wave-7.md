# Submission portal — Wave 7 handoff

Wave 7 closes the highest-risk promotion gaps left after the relational
organization operating system landed in Wave 6. It connects the applicant,
receipt, Opportunity, review, and decision surfaces to the same relational
authority without claiming hosted or provider certification that has not been
run.

## Delivered

### Applicant completion and recovery

- File uploads now report browser upload progress and retry one retryable
  provider failure without losing the packet in memory.
- Draft and final-submit conflicts surface a recoverable “changed elsewhere”
  state while preserving the applicant’s local answers.
- The review state now reports the packet contents: titled Works, attached
  files, visible answered questions, and category before confirmation.
- Final submission checks the published Opportunity opening, closing, and
  configured grace period at the server boundary.
- The Tracker receipt page now reads relational submissions, Works, answers,
  decisions, payment state, and private file references instead of calling the
  compatibility workspace when relational authority is enabled.

### Organization product

- Reviews and Decisions now consume relational Organization projections when
  relational authority is enabled; they no longer crash or silently fall back
  to compatibility state.
- Opportunity configuration supports typed eligibility, place, and commercial
  terms alongside dates and fees, with revision-aware save and a readiness
  summary before publish.
- The Opportunity builder links form editing to Portal Studio, preserving one
  stable form-version authority and applicant-draft pinning.

### Contract and type hardening

- Relational owner-submission detail has an explicit typed projection including
  answers, payment, Works, files, and per-Work decisions.
- Organization submission projections include review-round identity so the
  relational Reviews surface can group assignments safely.
- Opportunity configuration schemas validate eligibility, place, and terms at
  the HTTP boundary.

## Verification

- `npm test --workspace=@missa/workspace-engine`: 52 passed, 2 expected live
  PostgreSQL skips.
- `npm run build --workspace=@missa/web`: passed; 261 routes generated.
- `npm run typecheck --workspace=@missa/web`: passed.
- Targeted ESLint for all Wave 7 files: passed with zero warnings.
- `npm run check:design-system` and `npm run check:language`: passed.
- `git diff --check`: passed.
- Production-mode smoke: `/api/health/readiness` returned HTTP 200 with required
  database, session, and creator-authority checks ready; optional file, payment,
  email, and malware providers remain degraded because their hosted credentials
  are not configured in this environment.

The repository-wide lint command still reports pre-existing errors in unrelated
ranking components; those files were not changed by Wave 7.

## Remaining launch gates

1. Run the full applicant journey against a dedicated Preview Neon database,
   not the shared `neondb` target.
2. Configure Vercel Blob and the selected malware provider, then prove clean,
   rejected, unavailable, and retryable upload outcomes.
3. Exercise reviewer assignment, blind projection, decision finalization,
   message approval, and delivery retry in a hosted preview.
4. Complete keyboard, screen-reader, 200% zoom, 390px, physical iPhone,
   physical Android, and reduced-motion checks.
5. Verify the production database and Railway outbox worker separately from
   Preview. A green local build or deployed route is not submission proof.

Wave 7 therefore closes the local implementation gaps, but production launch
remains intentionally uncertified until these external gates are recorded.
