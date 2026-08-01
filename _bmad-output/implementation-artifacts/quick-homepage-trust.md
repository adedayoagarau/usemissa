---
title: Quick homepage trust and action slice
status: review
scope: tracker and organization sections only
---

# Dev Notes

- Kept this slice inside `apps/web/app/page.tsx` and `apps/web/app/home.module.css`.
- Added an explicit `Example view` disclosure to the tracker mock so the illustrative rows
  cannot be mistaken for a user's real submissions.
- Added a compact evidence row grounded in the current product: opportunity records retain source
  URLs, tracker records are account-scoped, and the signup form does not request payment details.
- Added an `Open your tracker` action using the existing session-aware `primaryHref`, preserving
  the authenticated `/tracker` destination and the anonymous signup flow.
- Removed the duplicate `Works` tab label from the static tracker mock.
- Changed the organization CTA to the real `/workspace` route and added a short next-step panel
  with existing `/login?mode=signup` and `/opportunities` routes. Copy describes available
  routes without making unsupported pricing, privacy, or verification claims.
- Added 40px minimum touch targets, visible focus rings, hover/pressed states, and reduced-motion
  transition overrides for the new actions.

# Validation Results

- `npx tsc --noEmit -p apps/web/tsconfig.json` — passed.
- `npm run build --workspace=@missa/web` — passed (Next.js production build and route generation).
- Local HTTP/browser smoke — blocked by the managed sandbox: localhost connections return
  `Operation not permitted` even while `next dev` reports ready. Verify the new links and
  responsive layout in the normal browser preview when available.
- No commit created by this worker.
