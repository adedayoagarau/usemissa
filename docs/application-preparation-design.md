# Application preparation preview

Route: `/design-system/application-preparation`.

A focused preparation surface, following the Salt Hill form investigation. Requirements are explicitly a September 5, 2026 research snapshot; the destination must be checked for current availability. All manuscripts and creator details are samples.

Intent: select an existing work/version, copy its title, download its sample file, edit and copy a combined cover letter and third-person bio, navigate to the official form. Opening the destination never changes a submission status.

Policy: composition.application-preparation; installed Button (primary/supporting actions), Field/Textarea (long text), NativeSelect (mobile single selection). Existing local UI sources and Studio inventory inspected; no vendor installation or new primitive. Semantic colors and standard interface typography. No decorative motion.

Boundary: local React state, reset on reload. No account persistence, real library, upload, autofill, demographic inference, or submission integration. Clipboard errors give manual-copy recovery. Empty work and blank letter/bio disable the relevant copy actions. Copy progress and result are announced with status text.

Validation: design-system policy and web typecheck passed. Local Chromium checked work switching, exact title clipboard, edited combined letter clipboard, sample download, empty selection, and no horizontal overflow at 390/320px. Desktop and narrow mobile screenshots reviewed. Reduced-motion override provided. Actual device, keyboard-only and browser 200% zoom certification remain outstanding; narrow viewport testing is not device certification.

Next: user review of this slice, then connect real reusable works and draft storage with the backend worker. Keep preparation state separate from confirmed external submission evidence.
