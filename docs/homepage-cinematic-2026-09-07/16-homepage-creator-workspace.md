# Homepage: applications, notifications and goals

The homepage was describing discovery repeatedly while omitting the creator tools. This change adds Tracker, Inbox and Goals to the public story, using simple copy and the existing product destinations.

## Source findings

Repository evidence was checked before adding claims:

- `apps/web/components/tracker-product.tsx` supports saved calls, private notes, application status, a calendar view and a per-call reminder toggle. `app/(passport)/tracker/page.tsx` loads the account's canonical tracked records.
- `apps/web/app/(passport)/inbox/page.tsx` reads account alerts and maps deadline reminders, opportunity changes and goal check-ins to the related product record. `components/notification-preferences-panel.tsx` persists notification preferences.
- `apps/web/lib/goal-engine.ts` stores goals and counts matching recorded submissions within the goal's dates. It supports discipline and target filters, pause/resume, next steps and scheduled check-ins. `app/goals/page.tsx` serves the actual account-owned GoalsWorkspace.
- Notification generation and email delivery are scheduled operations. No live subscription or instant delivery guarantee was established. Homepage wording says reminders, updates and check-ins; it does not claim real-time push or guaranteed email delivery.

External reference: [Linear's Inbox documentation](https://linear.app/docs/inbox) distinguishes the update centre from its notification settings; [notification documentation](https://linear.app/docs/notifications) distinguishes channels and delivery timing. These informed the explanation, not claims about Missa's implementation.

## Final page sequence

1. Approved green portrait hero; supporting sentence now includes applications, deadlines and goals.
2. Existing scattered-opportunities introduction, database counts and category carousel.
3. Real opportunities, using the exact OpportunityBrowseProjectCard rendered by `/opportunities`.
4. **Keep track of your applications.** Tracker explanation beside current public catalogue deadlines.
5. **Get updates in your Inbox.** Notification types and a direct Inbox link.
6. **Set a goal. See your progress.** Original studio photograph, explanation of targets and recorded submissions, and a Goals link.
7. Real organization profiles.
8. FAQs that now explain Tracker, notifications and goals as well as browsing.
9. Account invitation and footer links to all three creator tools.

## Components and boundaries

- Intent: composition, data display and navigation.
- Policy: `composition.homepage-workspace`, `composition.homepage-continuation`, and the existing opportunity-card policy.
- New local composition: `apps/web/components/missa/homepage-workspace.tsx` and its CSS module.
- Inspected installed Table, Studio `table-01`, Button, Skeleton, and the incumbent Tracker calendar rows. The Table supplies a read-only public date preview. There is no second opportunity-card variant.
- Actual TrackerProduct, InboxProduct and GoalsWorkspace remain the destination tools. Embedding those full account surfaces in public marketing would introduce private data and write controls, so the homepage links to them.
- The preview consumes the same validated API response as the existing homepage catalogue. Titles, organization names, IDs and dates come from the backend. It adds no request or account mutation.
- Only valid exact dates render as upcoming dates. Rolling or undated calls are not assigned invented deadlines. Loading, API failure with retry, and no-dated-record states have visible recovery paths.
- Notification categories are descriptions, not fabricated alerts. No unread counts, sent timestamps, saved states, goal progress or account records are invented.
- Goal and notification copy describe available behavior; this task does not claim an end-to-end notification delivery test.
- Colors and surfaces inherit the approved homepage token chain. Data uses the installed mono utility. The original imagery, category interactions and shared opportunity-card styling remain intact.

## Validation

- Desktop and 390px mobile screenshots, including long backend titles, plus 200% zoom and reduced motion.
- Public IDs and exact deadline dates compared against the current backend response. Shared card identity still compared with `/opportunities`.
- Failure, empty and retry states; keyboard FAQ; anonymous Save destination (intercepted, no account write).
- Accessibility scan of the homepage continuation, TypeScript, focused ESLint and required design-system check.

Preview is local; no production deployment or notification send was performed.
