# TC-05: Deadline reminder timing

This case covers creator-selected reminder times, same-day fallback behavior,
provider closing bounds, and calendar event semantics.

## Prerequisites

- [ ] Latest source passes `npm run build --workspace=@missa/web`.
- [ ] Missa runs at `http://127.0.0.1:3100` with creator relational storage.
- [ ] The test account owns a saved application with a fixed or exact deadline today and, where stated, a closing instant later today.

---

### TC-05-01: Choose a viable same-day deadline reminder

**Priority**: Critical
**Design Ref**: `DESIGN.md` interaction and accessibility contract; `apps/web/component-policy.json` `composition.application-reminders`

**Preconditions**:

- [ ] The saved application deadline is today and 9:00 AM has passed.
- [ ] No active deadline reminder exists for this application.

**Steps**:

1. Open the application in Tracker and choose **Set reminder**.
2. Select **The application deadline**.
3. Confirm **On the day** is paired with an editable **Time** field whose initial value is still in the future.
4. Enter a future time before the stated close and submit.
5. Reopen the created reminder and inspect its displayed due instant.

**Checkpoints**:

- [ ] CP1: Scheduling helpers accept the same-day future time and reject the close boundary — verify: `node --test apps/web/lib/reminder-schedule.test.ts` exits 0.
- [ ] CP2: The form exposes labeled `When` and `Time` controls and enables submission only inside the valid window — verify in the browser with keyboard-only navigation and save a screenshot as `test-results/TC-05-01-desktop.png`.
- [ ] CP3: The saved reminder displays the selected time rather than 9:00 AM — verify the reminder detail in the browser and save `test-results/TC-05-01-saved.png`.

**Cleanup**:

Cancel the reminder from its detail dialog and confirm it no longer appears in the scheduled reminder list.

---

### TC-05-02: Keep reminder actions on deadline events only

**Priority**: High
**Design Ref**: `apps/web/component-policy.json` `composition.calendar-planning`

**Preconditions**:

- [ ] The account calendar contains an opening event, an application deadline, and a response check-in.

**Steps**:

1. Open Calendar at 1280px and inspect each event.
2. Repeat at a 390px viewport.
3. Use Tab and Enter to open each event inspector.

**Checkpoints**:

- [ ] CP1: The deadline event offers **Set reminder**; opening and response events do not — verify: `node --test apps/web/lib/calendar-planning.test.ts` exits 0, then confirm the rendered inspectors.
- [ ] CP2: The inspector and action remain usable without horizontal scrolling at 390px — save `test-results/TC-05-02-mobile.png`.
- [ ] CP3: Focus remains visible and returns to the invoking control after closing the inspector — verify with keyboard-only navigation.

**Cleanup**:

No data cleanup is required unless a reminder was created; cancel any reminder created during the case.
