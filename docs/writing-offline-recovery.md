# Explicit offline project copies

The writing room prepares a project with `WritingOfflineProject`, using its
account `deviceKey`, the project and complete entries. The component belongs in
the existing project Tools disclosure. Call `activateOfflineAccount(deviceKey)`
on room mount even when no project is selected; call
`activateOfflineAccount("")` when a known sign-out is observed.

## What works

A downloaded project opens at `/writing-offline/index.html` after browser restart
without a connection. The offline surface uses the **actual WritingPages rich
editor**, installed shadcn Button/Input primitives, the canonical app stylesheet
and self-hosted interface/writer typefaces. It can search downloaded pieces,
read formatted documents, create new offline pieces, edit separate rich copies,
rename those copies, change local reading order, switch downloaded projects and
remove downloads. Bookmark the reader address: the normal `/doc` route still
requires a connection.

Original rich document JSON remains unchanged. Editing creates a separate rich
copy with a new entry ID and revision zero, queued into the account's existing
WritingSync device store. Returning to `/doc` online saves it through authenticated
revision/conflict handling. It does not replace the downloaded original or
flatten tables, images or text marks. Reading-order changes affect this device;
the account's original ordering is unchanged. Removing a downloaded project
leaves unsaved recovered copies in the normal sync queue.

Device backup includes original documents, pending copies and the current
in-memory document even if local storage fails. A document that fails the actual
shared parser can be read through its text fallback but cannot be edited as a
rich copy; the surface asks for a backup and online recovery instead.

## Storage and privacy

The service worker scope is `/writing-offline/`. Its cache allowlist contains only
anonymous static shell, generated editor JS/CSS and local fonts. It never caches
`/doc`, login, authenticated HTML, API responses or user text. Project snapshots
use explicit account-partitioned local storage. Account/project selectors are in
the URL fragment and are not sent to the server. Active-account mismatch blocks
rendering. This is partitioning, not encryption: anyone using the same browser
can access device storage. Clearing site data or browser eviction can remove
copies. Persistent storage is requested and denial is reported; a downloaded
backup provides another copy.

## Source and build provenance

`apps/web/offline/editor.tsx` composes the existing WritingPages and serializer.
`scripts/build-writing-offline.mjs` bundles this source with esbuild, compiles
canonical `app/globals.css` through the existing Tailwind/PostCSS packages, and
copies fonts from `apps/web/fonts`. Its next/font build adapter changes only
font loading into static local font faces. No new editor implementation, remote
scripts, authenticated data or external fonts enter the bundle.

Run the build script before dev/build. Generated output in
`public/writing-offline/generated/` is ignored by Git and narrowly excluded from
the design validator because it includes vendor implementations and compiled
canonical tokens. Authored source remains validated. The service-worker cache
version hashes JS, CSS and font contents; cache allowlist comes from build output.
The tiny static HTML bootstraps React and contains no hand-built interactive
controls. No primitive variants were added.

## Boundaries

Research, account membership/session checks, discussion and audio require the
online room. Offline changes never send background requests. Exact account
authentication is checked when the regular room saves. Downloaded originals
refresh only through an explicit online refresh. Local reading order does not
queue account reordering. Network/link content external to the downloaded
document is not cached.

## Evidence

Persistent Chromium was closed and reopened with networking disabled. The actual
rich editor loaded from cached assets; editing preserved bold marks and a table,
left the downloaded original JSON unchanged, and created a distinct revision-zero
rich copy. Rename, reload, search and creating another piece worked offline. At
390px the surface fit the viewport. Active-account mismatch hid old copies.
Existing WritingSync tests cover reconnect saves and non-destructive conflict
forks. Regression: `MISSA_OFFLINE_TEST_URL=http://localhost:3101 node
apps/web/e2e/writing-offline-browser.cjs`. This is local browser evidence;
production/device verification remains separate.

Research: MDN [Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers),
[Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API).
