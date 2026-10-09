# Writing room: compact controls and Drive verification

## Component manifest

Intent: disclosure (Tools and save details), navigation (recent drafts), action (new entry and backup).
Policy: composition.writing-room. Existing approved Button, Popover and DropdownMenu from apps/web/components/ui; composed in apps/web/components/missa/writing-room.tsx. No new primitive, variant, palette or font. Existing lemon/lime semantic tokens retained.

Mobile actions use the existing 44px icon buttons with accessible names and native titles. Tools opens a nonmodal popover instead of expanding the footer. Library opens up to five other drafts ordered by edit time, with an Open library action. Save details distinguish account storage from this browser and offer a plain-text copy. This copy preserves text, not rich formatting; full document exports remain in Tools.

OAuth return intent is captured by the room so mounting the nested Drive popover does not consume it prematurely. Closing Tools clears it; it is restricted to the returning entry.

## Evidence

- Design-system policy and changed-copy language checks passed; TypeScript and focused ESLint passed.
- Three Drive browser regressions passed: import/copy retry and blank/written OAuth returns (provider mocked).
- New browser check passed: 390px layout, saved local draft reopening, save-details download action, dark and light full-page Axe checks, keyboard Escape/focus return, reduced motion and 720 CSS-pixel reflow equivalent to a 1440px window at 200% browser zoom. Physical mobile Safari was not tested.
- Dark contrast failures from the earlier capture were mid-animation; settled theme checks pass without adding colors.
- Real production Google OAuth refreshed the already granted drive.file access for the user's existing account. Saved the synthetic Release verification draft as DOCX, selected that file in real Google Picker, and imported it as a different entry. Original and returned body/title match; returned entry displayed Saved to account. This is live provider evidence, separate from mocked tests.
- No schema changes or migrations needed.

## State coverage

Existing primitives supply hover, focus-visible and disabled states. Recent drafts includes an empty state and truncates long names. Save status retains opening, saving, device-only, offline/retrying and storage-failure distinctions. Backup is disabled while an entry is opening. Drive retains loading, error, explicit export preview, retry and connected success states.

External reference: Google distinguishes device-local edits from completed account sync and treats offline availability explicitly: https://support.google.com/drive/answer/2375012 . This informed wording only; behavior was checked in repository source and the browser.
