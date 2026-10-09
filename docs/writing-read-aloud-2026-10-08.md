# Tiered read-aloud — 8 October 2026

The owner approved Kokoro read-aloud across Missa plans: Free includes 5,000
characters/month, Plus includes 100,000, and Pro has no personal monthly
character cap. All tiers retain fair-use request limits and shared service
availability protections. These allowances were explicitly confirmed by the owner. This explicitly supersedes the
old blanket prohibition on sending writing to model services, solely for
speech requested by the author. No prose generation is introduced.

## Implemented

The footer speaker icon starts a frozen copy of the current piece; when text is
selected, it uses that selection. The existing editor,
formatting and Lock in patterns are preserved. Compiled and combined
manuscripts are excluded from this first integration.

The installed Popover, Button, ButtonGroup, Tooltip, Field, NativeSelect compose
WritingReadAloud. No registry component or theme was installed. The panel
uses Missa tokens and shows empty, unavailable-allowance, idle, loading, playing, paused,
stopped, completed and error states. Voice and playback speed are selectable.

The speaker button explicitly sends text to the same-origin POST /api/me/writing/read-aloud
endpoint. Audio is requested sequentially in chunks of at most 4,000
characters. Playback uses in-memory blob URLs, reused while the player stays
mounted; switching documents aborts requests, stops playback and revokes URLs. Speed changes
use playbackRate and do not regenerate audio. English voices ship first.

The server independently authenticates and resolves the account plan, rejects
cross-origin requests, bounds input and response bytes, allows known voices
and speeds, and uses a 45-second provider timeout. It uses raw HTTP to
DeepInfra's OpenAI-compatible audio endpoint with model hexgrad/Kokoro-82M.
Text and provider credentials are not logged by this handler.

## Cost controls and configuration

Server-only configuration:

- DEEPINFRA_API_KEY
- UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or the existing
  KV_REST_API_URL and KV_REST_API_TOKEN aliases
- Optional MISSA_READ_ALOUD_GLOBAL_MONTHLY_CHARACTERS, default 6,000,000

Atomic Redis reservations enforce each tier’s allowance per UTC calendar
month: 5,000 for Free, 100,000 for Plus, and no monthly ceiling for Pro.
All tiers retain 20 requests/account/15-minute window and a global service
spending guard. Pro usage is still counted so a later downgrade cannot reset
usage. A failed plan lookup blocks generation; it does not silently grant
Free or unlimited access.
Missing provider configuration or missing/unavailable shared quotas fail
closed before paid inference. Failed generation reservations are retained
conservatively because cancellation may still incur provider costs.

The default global cap corresponds to $5.94 in inference at the owner's
observed $0.99/million-character rate, excluding hosting, Redis, taxes and
bandwidth. It is a conservative rollout cap and must be sized before broader
paid launch. Sources: https://deepinfra.com/hexgrad/Kokoro-82M and
https://deepinfra.com/hexgrad/Kokoro-82M/api (checked 8 October 2026).

## Verification boundary

Unit tests cover request validation, authentication/plan resolution, quotas,
missing configuration, provider failures, response bounds and text chunking.
Browser QA uses synthetic Free, Plus and Pro accounts and mocked audio, exercising actual
browser playback without billing a provider. The public official demo lets
the owner evaluate real Kokoro voices independently:
https://huggingface.co/spaces/hexgrad/Kokoro-TTS

No paid provider inference, production deployment or production account
mutation was performed. Live audio still needs configured infrastructure
and a real-provider smoke test before release.

## Nonmodal design correction

Read aloud uses icon buttons within the existing footer. The speaker becomes
pause/resume during playback; Stop appears only while a session is active.
The same mounted controls persist through Lock in transitions. The draft,
save status and normal footer actions remain available.
Voice, speed, monthly allowance and provider details are disclosed in a small
settings popover opened by a chevron. Icon buttons have accessible labels and
playback tooltips. Errors open the settings popover with an alert.
Validation: two focused Chromium tests passed for playback, cached replay,
selection, tier details, provider errors, Lock in continuity, 390px reflow,
200% zoom and reduced motion; axe reported no violations in the tested controls.
Live provider audio and production deployment remain unverified.
Sentence highlighting and paragraph navigation remain follow-up work.


## Live Preview verification — 9 October UTC

Vercel Preview `dpl_HHkmUDB2Df3DDQkj8i4AYyazk6oL` built successfully from an isolated source snapshot. The owner enabled the sensitive DeepInfra key for Preview; the key was not retrieved.

Using the owner's confirmed desktop Google sign-in and the actual `/doc` editor, created a separate test piece titled **Read-aloud check** containing 67 characters of synthetic text. Heart (US English) and Emma (British English) both generated live Kokoro speech; Chrome reported **Audio playing** and the editor reached **Finished**. Prepared-audio replay, immediate pause, resume and stop were verified. Voice options and the Free 5,000-character allowance appeared in the settings popover. No mocked network or audio APIs were used for this hosted test. Anonymous POST returned 401.

Evidence: `docs/doc-progress-2026-10-08/kokoro-live-preview.png`. Test piece: `writing_9f120640-7d6d-4e2c-9fbf-35c9b390cbef`. Playback was stopped. The test piece remains available to the owner. This verifies Preview integration, not a production release or a measured audio-quality assessment. The previously documented live-provider blocker is resolved.

Final deployment `dpl_BnhaLEJo4WuGWRAukjDtsW2LqTGY` is READY. Reopened the same saved piece through normal Google sign-in and verified Heart live synthesis and pause again. Playback stopped. Final evidence: `docs/doc-progress-2026-10-08/kokoro-final-preview.png`.

## Range selection — 9 October continuation

The existing settings popover uses the installed NativeSelect for automatic selection-first, whole piece, selected text, cursor-to-end and beginning-to-cursor playback. Selected text defines both start and stop; with a selection, cursor ranges use its outer boundaries. Play snapshots the passage and range changes send no request. Four helper tests and browser payload checks cover boundaries, multi-page/canvas order and tracked-deletion exclusion. Keyboard, Axe, reduced motion and 390px at 200% CSS zoom passed. The installed Popover needed viewport width/height and residual placement correction under root zoom; this is a geometry adaptation, not a new visual token or primitive. Real provider playback evidence above predates this range change; these boundary tests use mocked audio.

## Selection-first correction

The owner's review supersedes the range-picker design above. Selected text now exposes a speaker icon directly in the existing highlight toolbar. It snapshots only that passage through the shared player; the range form and explanation are removed. Footer pause/stop and voice settings are reused. No new primitive or visual token was introduced.

Validation: highlight-only request boundary and keyboard activation passed on desktop/390px with reduced motion; selection-toolbar Axe checks passed. Existing Free/Plus/Pro playback, replay cache, voice, pause and stop test passed. Typecheck, focused lint, design-system and language checks passed. Browser audio responses were mocked for this correction.

Selection-speaker correction Preview reached READY: https://missa-5kilgd9fv-adedayoagarau.vercel.app/doc (`dpl_G3KwK8XygmgJybqEfUS4XYRm5hXi`). Production unchanged.
