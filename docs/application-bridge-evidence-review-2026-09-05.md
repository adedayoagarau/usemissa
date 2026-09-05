# Application bridge: evidence review and workspace design gate

## Decision

Pause further workspace UI implementation until a useful application journey has evidence behind it. The approved onboarding is separate. This review supplements `application-bridge-investigation-brief.md`; its earlier permission to proceed with workspace UI is superseded by the user's September 5 instruction to investigate first.

Research question: can a creator complete one application at its real destination with materially less repeated work, without introducing silent errors or losing their draft?

## Report audit

`docs/application-bridge-capabilities.json` is a worker-supplied hypothesis inventory, not a release capability contract. No application/runtime consumers were found by repository search on September 5. Preserve the original for audit; do not enable capabilities from its `pass` or `verifiedAt` values.

The supplied `transfer_benchmark.mjs` at `/Users/adedayoagarau/.gemini/antigravity/brain/1244e8cf-9d64-4311-ae0a-4c916c33046b/scratch/transfer_benchmark.mjs` contains hardcoded `simulationResults`: for example, email 85 seconds versus 18 seconds and Submittable 145 versus 42. It performs string transformations but has no browser session, human timing collection or destination request. Reported repeated measurements and percentage savings are not established by that artifact. Its URL-length thresholds and destination-specific word-count comments also lack runtime evidence.

Other claims needing evidence: real iOS/Android passes; native Missa submission receipts and status behavior; per-form authentication and file handling; current catalogue counts and terminal-destination classification. Neither a general protocol nor a documentation page proves these passed.

## Executed local experiments

Command: `node scripts/application-bridge-boundary-probe.cjs`.
Run: 2026-09-05T15:42:50Z; headless Chromium 151.0.7922.34; two ephemeral local HTTP origins. Five assertions passed:

| Experiment | Observation | Product implication |
| --- | --- | --- |
| Source script attempts to fill destination frame | SecurityError | Ordinary Missa page cannot directly operate an unrelated form this way |
| Navigate source tab to destination | Companion element absent | A mobile drawer inside Missa does not follow users to another site |
| Append a field query parameter to unconfigured form | Field remains empty | Prefill requires a destination-supported mapping |
| Assign a local path to a file input | InvalidStateError | A webpage cannot select a creator's local file by pathname |
| Put synthetic accented text and indented poetry into plain textarea | Exact value preserved | Local baseline only; no proof about clipboard, rich editors, saving or third-party fields |

These are browser-boundary experiments, not platform integration tests, device certification or evidence of effort savings. No external applications or messages were submitted. File test does not rule out user-selected files, supported upload APIs or authorized extension mechanisms.

## Supported mechanisms worth investigating

1. **User-invoked browser assistance.** Chrome documents temporary tab access through `activeTab` and script execution with `scripting`. This is a distinct installation/permission model from the Missa website. It warrants an isolated desktop prototype, not a claim that Submittable supports it. Verify per-platform permissions, mapping resilience, existing values and real-device availability independently. Source: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
2. **Recipient-configured prefill.** Tally documents hidden fields mapped to default answers, with matching case-sensitive parameters; payment and file-upload blocks are excluded. A random `?email=` parameter on an arbitrary form is insufficient. Start with one cooperating organization/test form. Source: https://tally.so/help/pre-populate-form-fields
3. **Portable materials and exact versions.** Candidate foundation: creator-approved bios, work versions, filenames and private application records. Avoid importing all public portfolio material automatically into private submissions. Test whether selection/export is faster than reuse already offered by the destination.
4. **Direct application acceptance by partner organizations.** Potential long-term reduction in duplicate work: let an organization accept a Missa packet or supported integration. This depends on recipient adoption and explicit receipt semantics. It is a product hypothesis, not an existing partnership or capability.

Browser origin constraints are also described at https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy . Cross-origin restrictions are not evidence that all integration is impossible; consented extensions, cooperating destinations and APIs have different boundaries.

## Experiments before UI

| Gate | Target | Evidence to collect | Decision |
| --- | --- | --- | --- |
| 1. Establish actual destinations | Published catalogue, Submittable and organization-owned forms first | Reproducible read-only count; terminal URL; unknowns; sample authorization | Prioritize by verified coverage, not supplied percentages |
| 2. Observe baseline | Writer, visual artist and interdisciplinary applicant tasks | Where time goes: choosing work, adapting answers, uploads, login or tracking; installation/setup included separately | Identify the repeated work worth removing |
| 3. Prove supported prefill | One authorized Google/Tally/Jotform fixture, expand only if useful | Exact mappings, conditional questions, Unicode, overwritten values, file/manual steps, resume | Narrow adapter or stop |
| 4. Prove browser assistance | Local fixture, then an authorized Submittable fixture if permission permits | User invocation; preview mapping; preserve existing text; changed-field rejection; no declaration/submit automation | Desktop pilot only if reliable |
| 5. Prove phone fallback | Real iOS Safari and Android Chrome | Copy/paste, tab switching, file picker, login, return and draft recovery | Phone-specific journey; desktop emulation cannot pass this gate |
| 6. Establish completion truth | Authorized test submission/email fixture | Distinguish handoff, creator acknowledgement, receipt and provider confirmation; retry/timeout | UI labels reflect the evidence level |
| 7. Measure benefit | Same task manual versus assisted, counterbalanced order | Recorded timings and operation counts; at least three exploratory repeats; errors and failures included | Proceed only if actual effort decreases without integrity failures |

The initial repeats establish feasibility, not conversion lift. A later consented pilot must test whether creators complete more applications and whether support/adapter maintenance is sustainable. No numerical savings claim until raw observations exist.

## Development process

- Each adapter starts as unknown with destination, form version, mechanism, permission role, supported fields, device coverage and evidence references.
- Separate the user's application record from transfer attempts and authoritative destination drafts. Opening a destination must never mark an application submitted.
- Establish synthetic fixtures and regression tests before integration code; malformed/changed mappings must stop for review, not silently guess.
- Keep exact creator-selected material versions; never overwrite a destination answer without review. Avoid sensitive application text in query URLs, analytics or logs.
- Prototype mechanisms independently from workspace composition. Add per-adapter disablement and a manual fallback before a pilot.
- Only design the workspace around the path that survives real workflow observation and device testing.

## Still untested

Real phone behavior, applicant-authorized external form filling, platform-specific extension permission, actual submission/recovery, human effort reduction, catalogue share and partner willingness. Required test accounts/forms and physical-device runs must be identified; unavailable access remains NOT TESTED. The local probe does not close those gaps.

## Live computer-use observations — September 5

Observed via Codex in-app browser UI, not scripted HTTP inference. This is desktop entry-flow evidence only.

- Opened https://tahomaliteraryreview.submittable.com/submit/334115/graphic-narratives . Public requirements were visible. Clicking Continue reached Submittable's account sign-in screen (email, Google and Facebook choices). The entry link contained the specific call return path, but successful post-login return remains untested. User was asked to sign in personally; no credentials entered, uploads made or application submitted. Authenticated fields, draft behavior and transfer remain NOT TESTED.
- Opened the worker's organization-form example https://arts.princeton.edu/fellowships/hodder-fellowship/ . It redirected to https://arts.princeton.edu/programs/fellowships/hodder-fellowship . Clicking Apply led to https://apply.interfolio.com/184993 . This sample is an Interfolio destination, not evidence for ordinary organization-owned form capability.
- On Interfolio, disabled optional functional/performance cookies and confirmed choices. Public instructions loaded. They include a resume, 500-word proposal and work samples with a separate 150-word relationship statement, plus discipline-specific media constraints. The organization summary omits some of these details. Both current pages restrict this cycle to dance, theater/music theater, visual arts and music, despite the organization's broader historical description.
- Interfolio's public page links Apply Now to https://dossier.interfolio.com/apply/184993 and describes a free Dossier account for applicants. No application was started. Existing destination material reuse must be inspected before assuming Missa should duplicate it.

Implication: verify the final application destination and versioned call-specific requirements before designing a preparation checklist. One organization description cannot safely stand in for its current application instructions. These observations do not establish platform-wide capabilities or catalogue percentages.

### Authenticated Chrome follow-up

With the user's explicit authorization, opened their existing native Chrome personal profile and used Continue with Google. Google requested basic name/profile-picture/email access; sign-in succeeded and returned to the exact Graphic Narratives call. This closes the successful-login return-path observation for this account and call only.

The next screen was an address-confirmation step with existing address/contact fields populated and a Save Address and Continue button. No fields were edited or saved. Personal values are intentionally omitted here. Application-specific fields remain beyond this step and untested.

This is direct evidence that the destination already reuses some account information. A Missa bridge should preserve that existing information and focus investigation on repeated work beyond it. No file upload, payment, application submission or draft-resume test was performed.

### Submission-form inspection after permission to continue

User authorized continuing with existing contact details. Clicked Save Address and Continue without changing their values; reached the same call with `?step=submission`.

Observed required fields: title (displayed 300-character limit), genre checkboxes (Fiction, Nonfiction, Graphic Narrative), word count, cover letter including a brief bio, an authorship declaration concerning AI/LLM generation, and attachment. A referral-source text field is optional. Requirements were read, not filled; declarations remain unchecked.

The displayed attachment extensions include DOC/DOCX/PDF/RTF and other document/archive formats, but omit PNG/JPEG, even though the prose guidelines request PNG/JPEG/PDF. PDF appears in both. This is a displayed-instructions mismatch, not a tested rejection of image files. Clicked the attachment control: it opened the native macOS file picker. Canceled without selecting a file; no upload, file acceptance or size limit was tested.

Observed $4 base fee, optional $2 donation and $3 expedited response, Save Draft and Continue to Payment controls. Neither action was clicked. The form explicitly warns that drafts may be visible to program administrators. Do not describe destination drafts as private to the applicant or use real calls for synthetic draft persistence tests.

Implications for the next experiment:

- Preserve existing destination account details; repeated work on this form is primarily submission-specific title/genre/count, creator-written letter/bio and file selection.
- Validate against both current prose requirements and actual field configuration; surface conflicts instead of silently choosing one.
- Separate private Missa preparation from transferring material to an organization-visible destination. Consent/declarations and optional purchases stay explicit.
- Build an isolated synthetic fixture matching these field types for transfer, Unicode, changed-field, draft/recovery and upload tests. This fixture can test mechanisms safely but cannot certify Submittable behavior.
- Authenticated live entry and picker-open/cancel have now been observed. Transfer fidelity, save/resume, payment, submission, receipts, real-phone support and effort savings remain untested.

### Controlled transfer experiment

Executed `node scripts/application-bridge-transfer-probe.cjs` at 2026-09-05T16:00:22Z with Chromium 151.0.7922.34. Seven assertions passed on a local synthetic form:

1. Actual clipboard paste preserved synthetic accents, blank lines and indentation in a plain textarea. Clipboard permissions were pre-granted by the test; normal permission prompts and mobile behavior are untested.
2. Candidate transfer policy stopped without partially filling when it encountered an existing different answer.
3. A 301-character title was rejected against a 300-character limit without partial fill.
4. Changing a field label caused the candidate mapping to stop.
5. A successful text transfer left the creator declaration unchecked.
6. Fixture-owned text saving survived reload; a selected file did not. File selection used Playwright's test facility, not a real phone picker or upload service; bytes were a synthetic placeholder, not a valid-document acceptance test.
7. An isolated browser context had no access to the fixture's device-local draft. This is not an account-connected Missa persistence test.

The transfer function runs inside the cooperating fixture itself. It is not an extension and does not defeat cross-origin restrictions. Policy assertions establish behavior of this small prototype only; real framework editors, conditional fields and destination changes still require separate tests. No human effort timings were measured.

Design consequence to test next: distinguish reusable saved text, file selection, completed upload and submitted receipt as separate states. Never imply that saving text saves an attachment. Compare the manual clipboard workflow against a user-invoked extension on authorized fixtures before choosing a workspace interface.

### Copy versus cooperative transfer comparison

Executed `node scripts/application-bridge-comparison.cjs` on September 5 at 16:40:25Z, Chromium 151.0.7922.34. Two different local origins; source page opens a destination. Source copy buttons use the real browser clipboard. The alternative sends a reviewed packet using `postMessage` to a cooperating destination which verifies source origin and opener. This is NOT the proposed extension and does not certify Submittable.

Six automated runs, counterbalanced copy/assisted/assisted/copy/copy/assisted. Each started with materials already prepared, destination open, fresh browser context and clipboard permissions granted. Two fields: title and letter. Both methods preserved exact text, accents, blank lines and indentation in all runs; declarations remained unchecked.

| Run | Method | Executed operations | Automation duration (ms) |
| --- | --- | --- | --- |
| 1 | Copy | 9 | 192 |
| 2 | Cooperative transfer | 2 | 34 |
| 3 | Cooperative transfer | 2 | 33 |
| 4 | Copy | 9 | 194 |
| 5 | Copy | 9 | 198 |
| 6 | Cooperative transfer | 2 | 34 |

Copy operations: copy title, switch destination, focus title, paste, return materials, copy letter, switch destination, focus letter, paste. Assisted operations: transfer packet and switch destination. Review itself is not timed. These are scripted operation counts and machine durations, not human effort savings, conversion evidence or a representative manual baseline. Copy already benefits from prepared materials and copy buttons. No login, material preparation, file upload, installation, permission prompts or human review duration is included.

Verdict: a cooperating recipient can remove per-field transfer operations. Whether this is worthwhile depends on recipient adoption and real task observations. The corresponding Submittable path still requires a genuine extension experiment, per-platform permission review, and real phone tests; it cannot reuse this test's pass status. Workspace UI remains paused.

### Actual extension experiment

Ran `node scripts/application-bridge-extension-probe.cjs`. The script creates a temporary Manifest V3 extension and isolated persistent Chromium profile, then removes both after execution. It does not install anything into the user's Chrome profile. Unlike the cooperative experiment, the destination is plain HTML with no receiver or transfer code. The extension uses the actual `chrome.scripting.executeScript` API in its isolated world.

First run FAILED exact text comparison: accented characters and an em dash were corrupted because the extension popup omitted a UTF-8 declaration. Added `<meta charset="utf-8">`; rerun at 2026-09-05T17:46:19Z passed six checks:

- No fill before the extension's button is clicked.
- Text reaches the non-cooperating local form exactly, preserving accents, blank lines and indentation; declaration stays unchecked.
- Existing different answers prevent any partial fill.
- Changed labels reject the mapping.
- Read-only fields prevent partial fill.
- Multiple matching destination tabs stop for disambiguation.

Permission boundary: `scripting` plus `http://127.0.0.1/*` host permission (Chrome match patterns span localhost ports), narrowed in code to the fixture's exact origin. This does NOT test transient `activeTab` permission. The popup was exercised as an extension page per Playwright's documented pattern, not through the real Chrome toolbar. No file transfer, account sync, external destination permission, mobile support, extension-store approval or human effort savings is established.

Primary implementation references: https://playwright.dev/docs/chrome-extensions and https://developer.chrome.com/docs/extensions/reference/api/scripting .

Decision: user-invoked extension transfer is technically viable on the controlled plain form without recipient cooperation. This justifies a narrow compatibility experiment on representative dynamic editors and actual toolbar permission behavior, not a universal application bridge or workspace rollout. The failed first run must remain part of the evidence: encoding needs regression coverage, not visual inspection alone.

### Dynamic-form and permission negative controls

Extended the extension probe and ran it at 2026-09-05T18:32:10Z. Original checks still passed. Additional observations:

- Missing questions stop transfer; after clicking the fixture's disclosure button, an explicit retry fills the newly inserted questions.
- Replacing the textarea with a contenteditable element causes a safe mapping rejection. Rich-text editing is unsupported, not passed.
- **Release-blocking limitation reproduced:** a synthetic editor that updates its model only for trusted input accepts the visible DOM assignment, but resets the values when it rerenders from its model. The adapter reports `filled` before that loss. This is an adversarial fixture, not an assertion that React or Submittable behaves this exact way. It proves DOM appearance alone is insufficient evidence of accepted editor state.
- In a fresh isolated profile, removed host permissions and declared only scripting + activeTab. An injection attempt before toolbar invocation was denied. This verifies the negative permission boundary; actual toolbar grant and revocation still require a headed computer-use run. Opening a popup page is not that test.

Verdict: do not promote this adapter. Next implementation must explicitly support each editor type and verify behavior through its normal validation/rerender/save cycle on authorized fixtures. Unknown editors should fall back to creator-controlled paste rather than report success. A short delayed DOM read alone cannot prove server draft persistence. No mobile or user-time savings claims are justified.

### Native toolbar and saved editor-state validation

Ran `scripts/application-bridge-toolbar-probe.cjs` in isolated headed Chromium and invoked the actual extension action through native computer use (Extensions menu → Missa Permission Probe). Successful complete run: 2026-09-05T19:25:52Z.

- Injection before invocation: denied.
- Native action click: granted; page visibly changed to Permission granted.
- Navigation to another path on the same origin: access retained.
- Navigation to a different local origin: access revoked, injection denied.

Only scripting + activeTab were declared. Two loopback origins were used, with no account data. The successful run closed its isolated browser and removed its generated extension/profile. An earlier interactive harness required stdin, which the tool session had closed; that harness was stopped and changed to wait for the visible page result. No personal Chrome extension was installed.

Extended the controlled-editor fixture with an in-memory local HTTP draft endpoint, saving the editor's internal model rather than DOM values. Run: 2026-09-05T19:26:26Z. Direct extension assignment still falsely reports filled; its text is absent after model rerender, server save and reopen. Actual browser clipboard paste updates the synthetic trusted-input model and preserves exact title/letter through rerender, server save and reload. Clipboard permission is test-granted. This fixture is not a production editor, authenticated account service, durable database, or real device test.

## Current product recommendation after executed tests

Proceed with a narrow research pilot, not a universal autofill promise or workspace rollout. Private preparation and creator-controlled reuse are the candidate foundation. Keep ordinary paste available; add direct fill only for adapters proven against their editor and save behavior. Basic permissions now have actual native-toolbar evidence, but that does not establish platform terms, store approval, mobile support or user benefit.

Remaining dependencies for a pilot:

1. An organization-authorized sandbox/test call for external save/resume and receipt testing; a real selection call where drafts are visible is not that sandbox.
2. Real iPhone Safari and Android Chrome participants/devices. Desktop emulation cannot close this gate.
3. Observed creator tasks, with manual/assisted order counterbalanced and setup/review/upload errors counted. Automated timing is not human savings.

No further UI redesign is justified by the existing timing results alone. The next decision should compare preparation-only against preparation-plus-assistance using these pilot observations, including destination-native reuse as a baseline.
