# One-hour implementation checkpoint

Started 2026-09-07 20:46 UTC; target 21:46 UTC. Baseline design-system check passed. Local server started on port 3100; existing homepage observed in Chrome before replacement. Existing changes are preserved. Root page source saved to previous-homepage.txt; old hero component remains unchanged.

Implementation decision: use six original matched studio stills and finite deterministic HTML/CSS architectural panels rather than generated video. This follows the goal's explicit one-hour fallback. No video playback or endpoint continuity is claimed. Initial Writing scene is visible without animation so the first paint communicates the creative concept; Close studio and scene changes are optional. Mobile uses a 4:3 bounded crop to preserve tools rather than a 9:16 crop that loses them. The entire page remains vertically scrollable.

Control intents: action.primary (Button + Link), action.supporting/action.quiet (Button scene commands and reset), setting.boolean (Switch), responsive navigation (Sheet), feedback.local-recoverable (Alert), data display (Item). Existing Button, Switch, Alert, Sheet, Item and Studio button-01 source inspected. No missing primitive, registry install or replacement required. New HomepageStudio is an original product composition of these primitives and photographic artwork, not a replacement control. Its finite media panels use the existing 280ms duration per phase and have an equivalent still mode.

Scoped files: root page import, new homepage studio component/styles/tokens/config, server homepage opportunities composition, isolated preview route, catalogue/policy additions, scoped test and evidence/artwork files. Existing dirty globals, auth, discovery and rankings files are not owned by this change.

Current content guide uses 'What do you make?' for selection; adopt that in place of the plan's public 'practice' label. The internal creative concept name remains A place for your practice. No tracker, reminder, submission or personalisation claims are added.
