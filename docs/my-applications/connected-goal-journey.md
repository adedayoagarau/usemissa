# Connected Goals: creative journey revision

September 7, 2026. This replaces the flat form on /goals. Existing goals and check-ins remain in the same tables; optional discipline column added through 0046_goal_disciplines.sql without resetting existing rows.

Next product direction: [Goals by opportunity type](goal-types-and-journeys.md) defines residency, fellowship, grant and other branches. Those typed journeys and completion measures are proposed extensions, not capabilities of this current submission-goal implementation.

## Journey

1. Empty account: welcome and an illustrated circle motif with one primary Create goal action. Decorative circles are hidden from assistive technology and do not represent account progress.
2. Your discipline: choose a catalogue discipline or all disciplines. Additional choices live in a native select. Selecting another discipline clears unsaved targets that may no longer match.
3. Your goal: choose count/date. Organization and Opportunity targets are optional, separate actions with separate drawers. Back retains entered values and selected targets. Closing setup cancels the view; it does not claim to save a draft.
4. Your plan: optional first step, visible weekly/30-day/off cadence. Name and recommendation settings are secondary disclosure. Creation persists discipline, target IDs, count, dates and plan under the same idempotency key; retry preserves fields.
5. Saved goal: real progress panel and next action. One circle equals one confirmed submission for targets up to 24. Larger goals use numeric progress with installed Progress to avoid suggesting that a circle means several submissions. Preparation/check-in never fills circles. Goal switcher only appears when multiple goals exist.
6. Check-in: a focused dialog, not a permanently required inline input. Explicit submit, loading state and retained data on error. Cancel/back do not save. On success return to updated next step; pause stops next due notification scheduling.
7. Suggestions: automatically show current open opportunities matching selected targets and discipline, within the goal date horizon where a dated deadline exists. Closed targets remain in the goal even if no current opportunity matches. Creator must still check eligibility.

## Target identity and visibility

Organization drawer uses gary_profiles, the same catalogue as public Directory, independently of active opportunity availability. Names, profile kind and location describe a place; there is no organization open/closed badge. Discipline narrows against known published call disciplines/genres or profile observation genres. Unclassified organizations are discoverable with All disciplines; we do not guess their discipline.

Opportunity drawer uses public canonical opportunities without an open-only condition. Type, current status and date describe a particular call. Closed rounds show Last listed deadline. The drawer explains that future calls should be targeted through their organization; a closed round is not silently converted into a future annual edition.

Saved goals keep existing private progress history. New discipline scopes counts against opportunity discipline/genres. Existing goals with null discipline preserve all-discipline behavior. Profile targets resolve their names from Directory, with legacy organization names retained as fallback.

## Design and component evidence

Selection: installed Button + NativeSelect; target disclosure: installed Sheet with different domain row compositions, isolated query/results and explicit selection state; focused check-in: Dialog; progress: GoalSubmissionProgress semantic wrapper around installed Progress plus decorative circles. Existing CreatorShell, Missa forest semantic colors and interface typography retained. No raw color, custom font, shadow, motion or external artwork added. Empty-state motif is a layout of existing shapes, not a fake data visualization.

GoalSubmissionProgress is registered in component policy/catalogue. The workspace composition is updated to include Sheet, Dialog and progress wrapper. Staged creation reduces simultaneous choices; no ornamental eyebrows added. Numbered navigation denotes actual setup state.

## Evidence and limits

Database tests verify closed-call discovery, organizations without open calls, discipline-specific counts, existing ownership checks, idempotency/concurrency and notification opt-out. Browser test covers real authenticated data selection, both drawers, back preservation, failed-save retry, reload persistence, recorded discipline/target IDs, check-in and pause/resume. Visual checks include desktop and 390px; keyboard Escape/focus, reduced motion, automated serious/critical axe checks and 200% text reflow are included where applicable. Screenshots use disposable test accounts, which are removed afterwards.

This improves the connected submission-goal journey. It does not certify recurring annual editions, outcome goals, hosted delivery availability or full eligibility matching. Existing local scheduler and notification contracts remain unchanged.

Research: [NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) informed staging advanced choices; [Explicit Differences](https://www.nngroup.com/articles/explicit-differences/) informed separate organization and opportunity choices. These are design principles, not evidence of usability testing with Missa customers.
