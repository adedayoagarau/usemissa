# Focused handoff moderated usability test

## Study decision

Determine whether Focused handoff helps creators save one public Opportunity privately, recover from authentication or service interruption, recognize material source changes, and act on one useful Tracker task without mistaking Save for eligibility or submission.

This is an initial formative round with 8–10 adult creators/applicants. It is not a prevalence study and must not be used to declare production readiness.

## Promotion-blocking failures

Stop and record a critical failure when a participant:

- believes the Tracker item or Profile became public;
- believes Save confirmed eligibility or sent an application;
- loses the intended Opportunity or cannot identify which one is being saved;
- relies on an old deadline, fee, destination, status, source, or eligibility statement after a material change;
- creates or reasonably believes they created a duplicate Tracker item;
- cannot recover after authentication, response loss, re-authentication, or interrupted connectivity;
- cannot complete the process with their normal assistive technology, keyboard, zoom, voice input, password manager, or copy/paste workflow.

## Session setup

- Length: 45–60 minutes.
- Use synthetic credentials and Opportunity data only.
- Ask the participant to use their usual device, browser, password manager, zoom, input method, and assistive technology where possible.
- Offer captions, camera-off participation, text chat, breaks, extra time, and no-recording participation without reducing compensation.
- Obtain separate consent for participation, recording, observers, and quotation.
- Do not collect passwords, identity documents, private application answers, unpublished Work, precise location, health/disability diagnosis, or another person’s data.
- Test one primary path and one assigned failure fixture per participant; do not exhaust every fixture with every person.

## Moderator opening

“We are testing a service journey, not you. Some parts do not work like a real product, and no account, Tracker item, eligibility decision, or application will be created. Please say what you expect before selecting an action. I may ask what you believe happened, but I will not help unless you become blocked or unsafe.”

## 1. Recent episode — 10–15 minutes

Ask before showing Missa:

1. Tell me about the last creative Opportunity you seriously considered.
2. Where did you find it, and what did you check before trusting it?
3. How did you keep its link, deadline, timezone, fee, and requirements?
4. What happened next: applied, abandoned, missed, or still considering?
5. Tell me about a time the source, deadline, fee, eligibility rule, or application destination changed.
6. Have you declined to create an account while researching an Opportunity? What made you stop?
7. What does “saved” mean in the tools you currently use?

Do not mention Missa’s proposed solution until this episode is complete.

## 2. Primary prototype task — 12–15 minutes

Fixture: **New customer · signup** or **Returning customer · login**.

Task:

“You found this Opportunity through a link from someone you trust. Decide what you would check. If you want to keep it, show me what you would do. Continue until you believe you have reached something useful.”

Observe without prompting:

- facts checked before Save;
- recognition of the exact Opportunity after the focused transition;
- account-purpose and private-state interpretation;
- expected destination after authentication;
- whether authentication success is mistaken for Save success;
- created receipt comprehension;
- discovery and interpretation of the first Tracker action.

Comprehension probes after the task:

1. What did Missa save?
2. Who can see it?
3. Did anyone at Field Assembly receive anything?
4. Did Missa decide whether you are eligible?
5. What would you do next?

## 3. Assigned recovery task — 8–12 minutes

Assign one fixture based on the study matrix:

| Fixture               | Research question                                           | Success evidence                                                                        | Critical failure                                                                       |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Existing email        | Can the person move to Login without losing context?        | Retains safe email/context and predicts return.                                         | Starts over, exposes account detail, or abandons because the Opportunity appears lost. |
| Incorrect credentials | Is failure field/form-associated and recoverable?           | Corrects and retries using normal password-manager/copy-paste behaviour.                | Intent loss, inaccessible error, or blocked password manager/paste.                    |
| Deadline changed      | Does the person notice and understand Was/Now before Save?  | States the current source deadline and makes an informed continue/stop choice.          | Relies on old date or believes Missa changed the Organization’s deadline.              |
| Opportunity closed    | Is the blocked outcome truthful and useful?                 | Understands no active item was created and can return/browse.                           | Believes it was saved as active or that an application was sent.                       |
| Save response lost    | Can canonical reconciliation restore confidence?            | Uses Check Tracker state and accepts Already in Tracker without retrying a blind write. | Repeats Save, assumes loss, or cannot tell whether a duplicate exists.                 |
| Saved twice           | Does Already in Tracker communicate idempotency?            | Identifies the existing item and no new write.                                          | Believes two items were created or a new Save is fabricated.                           |
| Cross-device resume   | Is account-bound resumption understandable?                 | Recognizes the same Opportunity and that re-authentication protects private state.      | Another account’s context appears plausible or the bearer link seems sufficient.       |
| Decline signup        | Can the person return to public reading without punishment? | Uses Keep reading and continues without a repeated obstruction.                         | Public content becomes inaccessible or the auth prompt loops.                          |

Ask: “What failed, what remained safe, and what would you do now?”

## 4. Guidance and first action — 5–8 minutes

From the Tracker item:

1. Ask the participant to explain why **Review eligibility** is suggested.
2. Ask them to open the official eligibility information and mark the review complete.
3. Ask them to dismiss guidance and find how to restore it.

Success requires distinguishing a suggested action from an eligibility decision and treating dismissal as optional—not as abandonment or onboarding failure.

## 5. Accessibility and resilience probes — 5–8 minutes

Use the participant’s normal setup or an assigned fixture:

- keyboard-only completion and visible focus;
- screen-reader heading/landmark order, field labels, error announcement, revalidation status, and mutation receipt;
- 200–400% zoom/reflow without horizontal page scrolling;
- voice-input action naming;
- reduced motion;
- extra time without timeout loss;
- password-manager and copy/paste compatibility;
- simulated intermittent connection or response loss.

Automated checks support but do not replace these tasks.

## 6. Closing — 3–5 minutes

1. What, if anything, made the account feel worth creating?
2. Which information or request felt premature?
3. What would you expect to find when you return tomorrow?
4. What would make you trust or distrust this Save result?
5. Is anything important missing from the next action?

## Observer note template

```text
Participant ID / date / moderator / observers:
Country and timezone:
Device / browser / connection:
Usual tracking method:
Access setup used:
Primary path / recovery fixture:

For each canonical state:
- State:
- Observed action:
- Expected result stated before action:
- Actual interpretation:
- Opportunity recognition:
- Private/public/recipient understanding:
- Save versus eligibility/submission understanding:
- Error, hesitation, workaround, or abandonment:
- Recovery outcome:
- Access, locale, timezone, or connectivity effect:
- Evidence: observed / stated / inferred
- Severity: critical / high / medium / low

First trustworthy value reached? Evidence:
Critical blocker:
Contradictory evidence:
Follow-up question:
```

## Analysis tags

Use: `object_continuity`, `auth_purpose`, `private_boundary`, `save_not_submit`, `save_not_eligibility`, `material_change`, `source_trust`, `created_receipt`, `already_saved`, `ambiguous_write`, `recovery`, `next_action`, `guidance_control`, `data_burden`, `mobile`, `low_bandwidth`, `timezone`, `locale`, `keyboard`, `screen_reader`, `zoom_reflow`, `voice_input`, `password_manager`, `shared_device`, `abandonment`, `support_need`.

## Evidence-confidence rule

- **High:** repeated observed behaviour across contrasting participants and no unresolved critical contradiction.
- **Medium:** observed in several sessions or strongly explained, with remaining segment/fixture uncertainty.
- **Low:** one statement, moderator-assisted behaviour, or an inference not reproduced in task performance.
- **Unknown:** not tested or blocked by prototype fidelity.

Promotion remains blocked by any critical privacy, access, data-loss, misleading-state, duplicate-write, deadline, or accessibility failure regardless of overall completion rate.
