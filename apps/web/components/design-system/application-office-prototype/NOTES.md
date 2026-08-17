# Tracker workbench prototype

Question: Can Tracker feel like a creator's entire private office while preserving clear ownership boundaries between Profile, Library, opportunities, applications, calendar projections, messages, submissions, and history?

This is throwaway UI. It uses synthetic data, keeps all state in memory, and performs no authentication, persistence, calendar write, portal fill, or real submission. The direct-submit receipt is a local interaction simulation.

Run from the repository root:

```sh
npm run dev --workspace=@missa/web
```

Then open `/design-system/tracker-workbench-prototype`.

## Tracker room contracts

- Today: prioritizes the highest-leverage private actions across Tracker; it does not mutate source records.
- For you: personalizes opportunities from explicit practices, Work, eligibility, availability, geography, and preferences; it does not predict acceptance.
- Notifications: groups changes, messages, reminders, and opportunity signals by consequence; it does not become canonical content.
- Pipeline: owns the creator's private relationship, status, notes, imports, and next action for each opportunity.
- Applications: owns preparation graphs, responses, versions, requirements, Work selections, controlled handoff, and receipts. Nothing is sent without the creator choosing the final action.
- Calendar: keeps Missa's private deadlines, response windows, reminders, and creator-approved work sessions canonical, then projects approved events to external calendars. It never claims provider delivery, provider refresh, or private-calendar access without proof.
- Work: shows Library Work and version connections; Library remains canonical for Work identity and files.
- Messages: attaches DMs, forwarded email, and replies to opportunities and applications; it does not treat unconfirmed text as eligibility or outcome truth.
- Submissions: retains receipts, Work snapshots, decisions, outcomes, and follow-up.
- Archive: removes inactive records from focus without erasing their activity history.
- Profile boundary: Profile supplies identity, practices, preferences, access needs, availability, and public presentation; Tracker owns active work.
- Library boundary: Library supplies Work identity, files, versions, rights, and presentation; Tracker owns each Work-to-opportunity and Work-to-submission relationship.

## Calendar connection contract

- `Add this deadline` projects one reviewed event. An unknown closing time stays visible and becomes an all-day event; Missa does not invent a time.
- A connected Google or Outlook calendar is the prototype's future direct-write path. The current product does not yet implement that provider connection.
- `Missa Deadlines` is the current product path: a private, one-way `.ics` subscription with stable events. The calendar provider controls refresh timing, and the feed cannot read private calendar events.
- The default deadline-change policy is `Ask me before updating`. Automatic updates apply only to events previously created and approved through Missa.
- A downloaded `.ics` event remains unconfirmed until the creator's calendar app accepts it. Missa may say `Added` only after provider confirmation.
- Projected events include the opportunity and application links so the creator can return to source context.
- Reading busy time or availability would require a separate, explicit permission and is outside this prototype interaction.

## Final action contract

- Journal or publication: `Submit to {organization_name}`.
- Grant, fellowship, or residency: `Apply for {opportunity_name}`.
- External submission platform: `Continue on {platform_name}`.

## Canonical application copy captured

- Work Samples: Library selection, constraint checks, creator judgment, progress, and application details.
- Budget: funding, costs, live balance, required note, validation, empty, save-error, complete, changed-guidance, and expired states.
- Budget review states are addressable with `?view=budget&budgetState=empty|save-error|complete|changed|expired`; the default `?view=budget` state remains interactive and incomplete until Installation materials receives `$1,500`.
- Review and submit: section-by-section review, a creator declaration kept separate from North River Review's terms, evidence-gated final action, a provider-confirmed receipt state, and an external handoff that stays unconfirmed without proof.
- Review states are addressable with `?view=review&submissionState=submitted|unconfirmed`; the default `?view=review` state keeps `Submit to North River Review` disabled until both required confirmations are accepted.
- `Submitted to {organization_name}` is reserved for a provider confirmation or receipt. An external handoff remains `Submission not yet confirmed` until the creator records that proof.

Verdict: pending user review. Delete or absorb the chosen interaction model after the prototype answers the question.
