# Goals: product and interaction scope

September 7, 2026. Design proposal and interactive local fixture at /design-system/goals. Not a production feature or reminder service.

## Purpose and position

Goals helps a creator translate an ambition into a workable plan, choose relevant opportunities, and return to the work. Independent navigation destination beside My applications; useful before any application exists. My applications owns individual submission records; Goals owns intentions and preparation. Library owns works/materials. Calendar owns scheduled dates. Recommendations use goals as an optional signal, never as an eligibility override.

Three starts:
- Submission target: submit 12 applications by December 31. Progress counts distinct confirmed submissions in the chosen date range and scope, including recorded unsuccessful outcomes. Saves, preparation, external clicks and repeated imports never increment it.
- Specific target: submit to a selected program/organization. Select a specific call if available; otherwise follow the program until a new edition is confirmed. An organization can run multiple programs: do not infer which one the user meant.
- Ambition: win a prize, secure a residency, publish a first collection. Preserve the ambition in the creator's words, but propose controllable milestones. Do not display a percentage chance of success or count preparation as a win.

## End-to-end experience

1. Entry: Goals navigation; My applications invitation/compact active-goal summary; 'Add to a goal' on an opportunity; 'Follow next edition' on a program profile; optional onboarding entry with skip.
2. Creation: choose type, title, measurable target where applicable, date range, first step, and optional program. Review suggested pace and scope. Choose recommendation influence independently from notifications. Avoid collecting a whole annual plan at signup.
3. Goal detail: progress/evidence, next step, preparation checklist, relevant applications, target programs and settings. Put action before analytics. Show pause/completed/archived states and restore controls.
4. Check-in: 'What moved forward?' with completed step, blocker, or reschedule. Offer a smaller step or revised target; ask for confirmation. Keep a dated history. No guilt copy, lost streak penalties, or automatic target increases.
5. Recommendation: 'Suggested for your poetry submission goal' plus actual reasons: discipline, verified eligibility, fee budget, location and preparation time. Show source freshness and unknown constraints. Allow 'not relevant', explain feedback use, and disable goal influence.
6. Application: save/create canonical application once; link to one or more goals. Confirmed submission contributes at most once per goal. Correcting/retracting submission updates progress; rejection does not undo the work of submitting. Outcome goals count only recorded relevant outcomes with provenance.
7. Return: email/in-app notification opens the owned goal and next step; login returns there. Links to applications preserve source and selection. Reload/navigation retain saved edits; cancellation never commits drafts.
8. Finish: recognize progress, review what worked, archive or deliberately copy a plan to next year. Do not silently renew a goal or notifications.

## Recurring opportunities

Separate organization, program/series and annual call/edition IDs. Follow the series; attach the actual edition only when confirmed. States: dates unconfirmed, confirmed upcoming, open, closed, canceled, recurrence discontinued. Historical dates may be shown as 'Last edition' with source/year, never converted into a current deadline. New confirmed edition produces one notification and offers review/save. No automatic submission, payment or application creation. Date changes reconcile pending reminders. Canceled programs suggest alternatives only with user choice. A creator can follow a program without having a numeric goal.

## Accountability and reminders

Missa is the private accountability tool in the first release; sharing with a human partner is a later, separately permissioned feature. No messages to others by default.

Offer weekly/monthly/off check-ins plus explicitly opted-in verified opening/deadline notices. On setup select channel, local day/time/time zone, quiet hours, and preview the message. Notification permission separate from marketing. Combine multiple goals into a digest; cap frequency; deduplicate goal and saved-opportunity deadline messages. Snooze, reschedule and pause affect queued delivery immediately. When someone falls behind: 'Would a smaller next step help?' rather than a failure warning. Never promise alerts while a provider is unconfigured. In-app fallback, delivery failures and unsubscribe must be visible and tested.

## Recommendation contract

Hard constraints first: current visibility, eligibility, discipline, verified open/upcoming state, fee cap and location. Goal intent then affects ordering and preparation horizon. Balance near-term feasible calls with selected longer-term targets; avoid flooding a user to meet a count. For conflicting goals, let users choose priority and weekly capacity. Unknown eligibility is visible, not scored as eligible. Pausing stops prompts; influence remains an explicit independent switch. Record explanation/provenance and allow resetting feedback. No inference of sensitive identity from a goal. Do not label generated scores as likelihood of winning.

## Data and service requirements

Goal: owner, type, title, target/date range, scope, active/paused/completed/archived, capacity, time zone, recommendation preference, version. GoalStep: due date, completion record. GoalProgram: canonical series/edition IDs. GoalApplication: unique goal/application link. GoalCheckIn: next action, optional blocker, created time. ReminderPreference and outbox: consent/channel/cadence, idempotency key, scheduled/sent/canceled/failed, suppression reason.

Use canonical confirmed submission events as progress source, not editable counters. Handle imported timestamps, withdrawn submissions, multiple editions and account isolation. Persist event provenance; preserve history when a public call disappears. Mutations versioned/idempotent and reconcile reminders atomically through outbox. Private goal content excluded from public organization/ranking data. Export/delete policies include goals and notification records.

## Visual direction and carryover

Refined planning workspace using Missa typography, forest semantic tokens, existing shell, compact controls and restrained borders. Goal list on desktop, stacked mobile. One focus panel: progress, next step, preparation. Secondary reminder/recommendation settings below. Application page now has a compact Goals doorway and a tighter search/add toolbar; records retain recognizable opportunity type, organization, title and dates. No competing dashboard gauges. Existing primitive sources: ui/button, input, native-select, dialog and application-labels semantic wrapper. Native progress/checkbox semantics for bounded progress and task selection; no custom motion.

## Phased delivery

1. Design preview (this pass): creation, selection, checklist, next-step check-in, pause/resume, preference controls, sample recurring follow/unfollow, two-way navigation. Memory only. No notifications or recommendations actually run.
2. Durable first slice: create/edit/archive/restore goals; scoped canonical submission progress; goal/application linking; first-use/empty/error/retry/concurrent states and real-account tests.
3. Accountability: dated check-ins, reschedule/snooze, notification setup, delivery proof and cancellation tests.
4. Recurrence: source-governed program editions and confirmed opening alerts.
5. Recommendations: explainable goal influence, constraints, feedback and relevance measurement. Human partner sharing only after privacy/consent design.

Remaining design interactions before production: full goal editing, archived list, application-link picker, blocker/reschedule flow, notification channel/time setup, dated check-in history, empty account. These are specified, not implied to work in the preview.

## Validation and research

Repository evidence: existing creator shell, ApplicationsDesignPreview, canonical tracker direction and the current component policy. Narrow lib search found no goal service; this is not an exhaustive backend audit.

Research informed autonomy and clear progress, not an efficacy claim: [Self-Determination Theory](https://selfdeterminationtheory.org/the-theory/) describes autonomy and competence as motivational supports. [NN/g status tracking](https://www.nngroup.com/articles/status-tracker-progress-update/) supports explicit state and updates. Design inference: controllable steps, user-set cadence and visible provenance fit Missa better than competitive streaks.

Local QA: nine browser scenarios passed across Applications and Goals; three Goals scenarios rerun successfully after mobile refinement. Desktop and 390px captures reviewed. Mobile axe scan has no serious/critical findings; reduced motion enabled. Design-system policy and project TypeScript check passed. Preview uses installed Progress rather than browser-default coloring. Mobile chooses a goal with NativeSelect so action does not sit below the entire list. Full delivery/recommendation/integration tests remain future work.

Additional accessibility check: 200% text reflow at 640px and explicit dialog focus restoration tested. Creation dialog scrolls at constrained heights. Goal picker replaces the full list on mobile. Controls remain experimental until account-backed integration is complete.

## Copy and visual revision

Removed the introductory eyebrow and motivational filler following direct user feedback. User-provided welcome leads the page. Larger submission count, semantic accent goal panel, white task rows, and collapsed reminder/recommendation settings prioritize the happy path. Completing a preparation step announces brief positive feedback without incrementing submission progress. Four browser scenarios and design-policy check pass after this revision.

## Composition revision

Replaced the narrow list/long detail composition with a three-goal overview and split progress/action panel. Primary forest panel visualizes completed submissions as decorative markers (bounded to 24, proportional for larger targets); installed accessible Progress retains numeric semantics. Checklist and next action sit beside progress on desktop, stacked on mobile. No new primitive styles, raw colors or motion introduced. Four interaction/accessibility scenarios and TypeScript check passed. Default next action now matches the first unfinished preparation step.
