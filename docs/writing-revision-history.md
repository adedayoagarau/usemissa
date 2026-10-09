# Piece revision history

Existing writing-room snapshots are now Revision history, an optional Sheet
opened from More. Source: installed Sheet, Item, Button, Field/Input, Switch,
DropdownMenu, Dialog and AlertDialog; semantic tokens only, no new primitives.

Dated versions group by day. Creators can name current or earlier versions,
filter named versions, compare words/title and restore a separate rich copy.
Text comparisons mark additions/removals; equal text with different rich
content reports formatting/layout differences. It is not a visual format diff.
Deleting a version requires confirmation.

## Integration

`WritingSnapshots` adds optional `onRestoreCopy(content, versionName)` to the
existing props. Supply this in the room to create a new piece while keeping the
current one. Restoration first saves a version of current content. Preservation
or copy failure never replaces current writing. The legacy `onRestore` callback
keeps its previous preservation step for compatibility.

`useAutomaticWritingHistory({entryId,content,enabled})` returns ready, saving,
saved or attention. Enable for an owned, account-saved editable piece; display an
attention message for failed history saving. Normal draft saving is a separate
claim. First check:15s; subsequent checks:30s. It keeps opening session content
after the first detected change, then a first changed checkpoint and thereafter
changed content at most every five minutes. Failed attempts reuse a snapshot ID.
The session retains32 recent piece recorders. Pending history is held in memory,
not advertised as durable offline history; device copies/sync protect writing
separately.

## Ownership and bounds

Account/entry scoping covers list/get/create/rename/delete. PATCH changes a label,
never date/content. Creation/naming locks the owned entry in a transaction:
maximum100 named versions, protected from pruning; latest100 automatic versions.
The list bound is200. Capacity failures return409 with a readable message.
No migration required.

Real local PostgreSQL tests verified stranger rename denial, content/date
preservation,101 automatic versions retaining100 while preserving a named
version, idempotency, named capacity and concurrent admission:99 named +five
requests admitted exactly one. Recorder unit tests cover baseline/changed
checkpoint/interval/same-ID retries. Browser script:
`MISSA_HISTORY_TEST_URL=http://127.0.0.1:3101 node apps/web/e2e/writing-history-browser.cjs`.
Browser and production evidence remain separate from unit/DB proof.

Reference: Google's official [version history guide](https://support.google.com/docs/answer/190843)
was read for right-panel history, named filtering, comparisons and copying an
earlier version. Missa uses approved components and its own ownership model.

Actual app browser verification passed: named history, renaming, filtering,
comparison, separate-copy restore with original preservation, two automatic
account snapshots,117-character labels at390px,200% reflow, Axe WCAG AA, keyboard
focus and reduced motion. The history Sheet uses full mobile width and opacity
entry/exit so its slide transition cannot extend document width.
