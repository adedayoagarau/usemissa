# Writing workspace design pass

## Clean writing and Lock in

The latest pass keeps the original document shell while reducing persistent
controls. Formatting reveals the existing formatting bar and typeface/size
choices. Tools reveals the timer setup, fullscreen, project tools and export.
New entry, Library, the document menu, word count and save status stay available.

Lock in starts or resumes the existing timer, closes companion tools and
removes ordinary chrome from the page. The same editor continues saving.
Pause/Resume, time remaining, save status and Leave Lock in remain available.
Escape exits and pauses the session. Completion does not interrupt writing;
Start again begins another session. It does not block other apps or browser
navigation. Flowing text temporarily uses the existing draft view for readable
mobile text; leaving restores the chosen view without changing saved formatting.

Component manifest: action/disclosure uses installed Button and ButtonGroup;
selection uses the existing DropdownMenu timer choices; status uses the existing
save state and a labelled session region; composition stays in WritingRoom and
WritingPages. No new primitive, font, theme or animation was introduced.

Nine targeted Chromium scenarios pass, including lock-in saving, pause/resume,
Escape, typography persistence, rich editing, canvas, Harper and project tools.
The final focused session scenario also verifies elapsed-time completion and
restart. Mobile at 390px, reduced motion, automated Axe and desktop screenshots
were inspected. Production build, TypeScript, ESLint, design-system, language
and diff checks pass. This remains local; no preview or production deployment.

## Owner correction: preserve the original /doc

The owner rejected the full-screen replacement workspace described below.
That approach is superseded. `WritingStudio` now renders a nonmodal companion
panel inside the existing `/doc` shell: alongside the document on desktop and
below it on mobile. The original page, formatting bar, typeface controls, timer
and footer remain. Research uses the open editor's selection and inserts into
that editor; it no longer mounts a second copy of the draft. Combined editing
is an explicit mode in the existing document area, with Back to piece.

The shared Dialog workspace variant was removed. Tabs, DatePickerField and
ConfirmDialog remain installed components. A preservation regression verifies
that the original draft is editable and saves while tools are open, without a
modal. Local source/browser evidence does not update the public concept URL.

Current component manifest:

| Region | Intent / policy | Installed implementation |
| --- | --- | --- |
| Primary editor shell | composition.writing-room | Existing WritingRoom and WritingPages; original header and footer |
| Companion project tools | composition.writing-studio | WritingStudio with section Tabs, Button, existing Structure, Research and Export compositions |
| Optional combined editing | composition.writing-manuscript | WritingManuscript in the primary document area, with Back to piece |
| Research anchor and citation | composition.writing-research | WritingResearch uses the primary editor selection and transaction; no duplicate draft editor |
| Dates and removal | DatePickerField / ConfirmDialog | Existing semantic wrappers retained |

All six targeted browser scenarios pass after integration. The dedicated
preservation regression also passes, covering editing/saving with tools open,
keyboard arrows, long content, mobile, zoom-equivalent reflow and Axe. Desktop
and mobile captures confirm the original document controls remain. Shared
Dialog source is restored to its previous implementation.

The original pass below is retained as a record of the rejected direction.

Register: Creator product. Mode: Operate. The author's draft is the main task;
project navigation, formatting and saving support it. The visual authority is
`DESIGN.md` and the owner's component-faithful directive, not the concept URL.

## Component manifest

| Region | Intent / policy | Component and variant | Installed source | Status |
| --- | --- | --- | --- | --- |
| Workspace shell | composition.writing-studio | WritingStudio; DialogContent workspace | components/ui/dialog.tsx | approved local adaptation |
| Section navigation | composition.writing-studio | TabsList section; touch triggers | components/ui/tabs.tsx | installed |
| Manuscript | composition.writing-manuscript | WritingPages and active-piece WritingFormatBar | components/missa/writing-manuscript.tsx | installed composition |
| Planning dates | date.selection | DatePickerField / Calendar | components/missa/date-picker-field.tsx | installed semantic wrapper |
| Research and planning removal | ConfirmDialog | useConfirm, destructive confirmation | components/missa/confirm-dialog.tsx | installed semantic wrapper |
| Checkpoint removal and account-copy replacement | ConfirmDialog | useConfirm; explicit consequence copy | components/missa/confirm-dialog.tsx | installed semantic wrapper |
| Save and recovery | composition.writing-studio | Button and labelled status in stable bottom bar | components/ui/button.tsx | installed |

The full-viewport dialog variant retains Base UI focus protection while removing
the floating-card treatment. The stable header and save bar frame a scrollable
workspace. The visible heading is the project title; the accessible dialog name
also identifies the writing workspace. Notes and plans remain explicitly saved,
while drafts retain their existing autosave. Only the focused piece exposes
formatting, preserving separate editor identities and undo histories.

No missing registry pattern required installation. Existing semantic controls
fit date selection and confirmation; the workspace treatment is an approved
variant of the installed Dialog, recorded in DESIGN.md, policy and catalogue.
No shared theme, fonts or global tokens were replaced.

## Evidence

Desktop and 390px screenshots were inspected in one batch; mobile's oversized
heading/save block was corrected together. The confirmation pass checks the
final stable footer and shorter visible heading. The targeted Chromium suite
covers persistence, readers, rich editing, canvas, Harper and failure recovery.
The studio scenario includes a long title and multi-page text, reduced motion,
focus, automated Axe, 200% CSS zoom-equivalent reflow and cancelling removal.
This is a reflow check, not physical Safari/OS zoom certification.

Installed controls supply hover, focus-visible and disabled behavior. The
workspace preserves loading, empty, unavailable entitlement, storage failure,
conflict, save error and save success states. No new animation was added.

Design-system, language, targeted ESLint, TypeScript and production build are
checked before handoff. This pass changes local source; it does not deploy the
public concept URL or migrate production. Physical screen readers and browsers
other than Chromium remain outside this local certification.

[WAI-ARIA tabs guidance](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-manual/)
informed retaining the installed keyboard navigation and selected-tab semantics.
