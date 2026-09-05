# Public creator portfolio

The public profile is the visitor-facing result. Its identity, selected work, books and credits serve visibility across disciplines. Portrait, editorial Newsreader headings, Instrument Sans interface text and the approved green surface carry the design direction.

## Routes and ownership

- `/design-system/creator-profile-v2`: fictional public portfolio; no setup/edit controls or private draft reads.
- `/profile/portfolio`: authenticated owner settings, reached through **Your account → Public profile**. Anonymous visitors redirect to login with a return destination.
- `/design-system/creator-profile-settings`: explicitly labelled sample-account settings for design QA; separate draft key, no account data.
- Existing `/profile/[userId]` and handle routes retain their public identity projection and privacy guards. This revision does not publish portfolio data onto those routes.

## Journey

Sign in → Your account → Public profile → Set up portfolio → select practices → identity and optional public contact → mixed-format work → optional books/publications → preview → Save draft.

Returning owners restore the draft and choose Edit portfolio. Save is explicit, with loading, success, failure and unsaved-change feedback. IndexedDB stores text and locally read media on this device under the authenticated account ID. Reloads restore the draft; storage failure is reported. This is not account synchronization, encrypted storage or public publishing. The Publish control remains disabled with an explanation until a backend portfolio/media contract is connected. No sign-in email is copied into public contact.

## Visitor interactions

- Contact sits beneath the bio beside accessible website/social icons. Real drafts render only supplied valid contact URLs. Fictional sample actions open an explanatory dialog rather than pretending to contact a real creator.
- Format filters are derived from actual content, not selected practices. The interdisciplinary project can contain text, imagery and audio. Writing shows reading content; Images shows visual content; Sound is offered only with audio and shows native playback. All work combines the formats. Active selection is announced.
- Read poem / Read full text uses the approved outline Button and opens the full text in a scrollable Dialog. The sample full poem extends its excerpt. Escape closes and restores focus.
- View image enlarges the image in a labelled Dialog. No autoplay or animation is introduced.
- Books and Selected publications can be hidden or reordered without deleting their data. Empty sections disappear. Optional validated external links use an outward arrow. No false sample purchase or publication destination is supplied.

## Component choices

Intent: composition, filtering, action, input, disclosure and status.

Implementation: `apps/web/components/creator-portfolio-studio.tsx` and its CSS module; draft adapter `apps/web/lib/creator-portfolio-draft.ts`. Installed `ui/button.tsx` supplies primary actions, outline reading/media links and ghost filters; `ui/input.tsx`, `ui/textarea.tsx`, `ui/dialog.tsx`, and `institution-social-links.tsx` supply remaining interactions. Local Studio inventory and configured registries were checked; existing components cover this slice and no registry installation or vendor theme is needed. Policy entries: `composition.creator-portfolio`, `filter.creator-work-format`, `action.primary`, `action.supporting`, `input.short-text`, `input.long-text`.

Default, hover and focus use installed Button states; disabled setup/save/publish, loading storage/save, empty portfolio, validation/storage errors, and save success are represented. CSS uses semantic color and radius tokens.

## Boundaries and next backend contract

This editor supports multiple mixed-format selected works, one book and one publication. Multiple books/publications, videos, discipline-specific release/performance templates, cross-device drafts, media processing, account publication revisions and search visibility are not implemented. Only Books and Selected publications can be reordered in this slice. Do not label this a complete production portfolio builder.

Required backend work: owner-authenticated revisioned drafts; media upload/storage and safe public delivery; structured work/book/publication arrays; explicit public contact consent; publish/unpublish snapshots; existing profile privacy enforcement; stable public URLs. Publishing must never expose private account preferences or an unsaved draft.

## Validation

Automated browser coverage lives in `apps/web/e2e/creator-portfolio-journey.spec.ts`. It checks anonymous settings gating, preview-only owner onboarding, validation, draft restore, distinct format views, keyboard reading/focus restoration, image disclosure, responsive overflow, and public WCAG A/AA checks. Authenticated real-account storage is not exercised; no database was changed. See the latest handoff for execution outcomes.

Execution on 2026-09-04: both focused Playwright journeys passed against localhost:3000, including reload with an uploaded image, 320/390/640/1280px overflow checks, keyboard activation/Escape/focus restoration, and public-main Axe WCAG checks. The 390px screenshot was visually reviewed. TypeScript, scoped ESLint and design-system policy passed. The 640px case checks narrow reflow but native browser 200% zoom was not independently exercised. Real signed-in account journey remains a server-guard/source review plus a sample-account editor test, not a production certification.

Follow-up review: Images now contains image context only (title and visual caption); mixed-format prose, Books and Selected publications are restricted to All work/Writing. Image titles/captions remain for context and accessibility. Book covers/titles and publication headings use supplied validated URLs; unlinked records remain static. Fictional sample book/publication buttons open explicitly labelled local detail dialogs without fabricated external destinations. Browser regression coverage checks these boundaries and restored outbound destinations.

Multiple selected works: owner step 3 now adds, selects for editing, removes and reorders works. Each work stores its own media/text. Public format views filter the collection, and reading/image dialogs bind to the selected item. IndexedDB saves the ordered array and migrates an earlier single-work draft on read. Untitled drafts remain editable but are excluded from the public preview. Browser tests passed for add/remove/reorder, reload with media, format isolation and reading the second work; TypeScript and policy checks also passed. This remains device-local draft storage, not publishing.

Each selected work now has an optional external URL, including link-only works. The editor validates http/https destinations and selects the offending work when validation fails. Public cards render a native Open work link with an external-tab label only when a valid URL exists. URLs persist with the ordered work array; old drafts without URLs remain compatible. Browser coverage checks unsafe URL rejection and destination persistence after reload.

## Full-page journey revision (2026-09-04, supersedes modal onboarding above)

Creators enter a full-page editor with independent About you, Your practices, Selected works, Books, Publications, Contact & links, and Appearance sections. There is no mandatory sequence or completion pressure. Work entry progressively reveals Link, Write text or Upload media; creators can combine these formats. The desktop portfolio preview updates alongside the form; mobile uses Preview profile / See your profile and Return to editor. Media displays locally as it is read, with lazy image rendering in the public work list.

Drafts autosave to device-local IndexedDB after a short pause, including partial/untitled work. Loading prevents edits before a saved draft is restored. Save now retries failures; the user is told that nothing is published. Publication/account sync remains unimplemented. No change is made to the existing public account profile.

Link preview requests are debounced and cancelled when the URL changes. The preview displays hostname, fetched title and description, a real outbound link, and loading/unavailable/retry states. It does not embed arbitrary websites or play media automatically. The service accepts only http/https, bounds response size and concurrency, validates public IPv4 DNS results, pins the resolved address, revalidates redirects, limits redirects/time, and sends no account cookies. Sites without HTML or accessible metadata retain a working link. No cover image is invented.

Publication association uses the installed Combobox with async name-only public-directory search, canonical ID/name/kind/profile path, duplicate path suppression, keyboard choice and manual-name fallback. Editing the name removes a stale association. The organization heading links to its directory profile while the publication action keeps the actual work URL. Association is a creator-added credit and conveys no endorsement/verification; it currently persists in the private device draft only. One publication record remains supported in this slice.

Appearance offers Sage studio, Paper, Mineral and After hours using existing palette tokens. Selection updates the preview and persists with the draft; typography/layout are fixed. Public background uploads are intentionally outside this variant.

The focused browser suite verifies the full-page journey, progressive work fields, media preview, autosave/reload/reorder, content filtering, link loading/failure/retry, private-address rejection, directory selection and separate credit/work URLs, theme persistence and public/editor accessibility. Live example.com metadata and the actual directory query were also exercised read-only. Signed-in real-account editing remains guarded by the existing session but is tested through the equivalent sample-account editor; production publishing is not certified.

## Temporary phone review

Review URL: https://learning-number-mayor-controlled.trycloudflare.com/design-system/creator-profile-settings

The local proxy at 127.0.0.1:3099 forwards only design preview pages, public directory-profile paths, static preview assets, the bounded link-preview endpoint and public directory search. It strips cookies and response cookies, blocks other routes/methods, and forwards the development update socket. No Vercel deployment was created. Runtime proxy/config are in `/tmp/missa-phone-preview`; tunnel lifetime depends on the Mac and local processes remaining active. The Mac was kept awake for four hours for this review, not indefinitely. Phone drafts are local to that browser and URL; changing the temporary hostname does not migrate them.

Final phone verification: the public tunnel was exercised at 390px, including interactive Appearance selection, actual computed dark background/text, eight live name-matched directory options, and blocked private API access (404). The focused browser suite passed all three journeys, including Axe contrast checks after theme CSS loaded. TypeScript, scoped ESLint, adapter build, policy validation and diff whitespace checks passed. Phone screenshots were visually reviewed; the floating preview control hides while text fields/combobox are active to avoid covering input on a small screen.

### Phone refinement and next handoff

Upload selection uses the existing Button policy with a labelled native file input: visible Add, Replace, Remove, supported formats, size limit, and the existing media preview. No vendor component or theme was installed. Filters are shown only for multiple media formats. Book cover/title retain their destination without a duplicate button; publication credits lead with the work title and retain separate organization and work destinations. Link-only work shows its destination hostname. Mobile preview navigation has its own bottom surface and safe-area padding.

Next slice: connect this editor to authenticated account storage, durable media upload, and an explicit preview/publish/unpublish journey, then render the approved portfolio on the real public profile route. Current drafts remain device-local; this pass does not publish anything. Preserve existing drafts during migration. Optional fetched metadata must be reviewed by the creator before becoming authored profile content.
