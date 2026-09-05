# Creator onboarding — design preview

Review route: /design-system/creator-onboarding. Component: apps/web/components/creator-onboarding-preview.tsx.

Two optional questions: creative practices (multiple), opportunity interests (multiple). Back preserves selections, skip proceeds without required input, and review permits editing. The final actions lead to real browse and the existing portfolio design preview. No artificial loading, account-save claims, recommendation counts or publishing are simulated. Choices currently live in React state and reset on reload.

Intent: selection uses installed ui/Checkbox, actions use ui/Button, navigation uses Link with existing buttonVariants. Existing semantic Tailwind tokens only; no registry install or new primitive variant. Mobile stacks the editorial panel and form; keyboard-native checkbox controls and focus transfer to each step heading are included. Selection status is announced. Production loading/error/success states remain pending authenticated persistence.

Production journey: finish the action that brought the creator to signup first, then offer optional personalization. Do not interrupt first-save resume. Keep broad private interests distinct from public portfolio labels. Detailed genres, geographic eligibility and notification consent can be requested in context later. Do not infer eligibility from practice selection. API taxonomy mapping and resumable account persistence must be verified before cutover. The current onboarding API uses engine persistence and should be reconciled with relational preferences before connecting this preview.

Design reference: https://www.nngroup.com/articles/mobile-app-onboarding/ — brief optional onboarding and contextual learning. Existing auth-onboarding directions remain available; this preview does not replace production signup.

## Editorial refinement

Mobbin reference reviewed visually: Skillshare Selecting topics, https://mobbin.com/flows/8c3afc1a-303c-4d1f-b459-06455fe6267a. Adapted its clear topic-card selection pattern, without its mandatory selection count or matching animation. Nextdoor interest selection was also inspected: https://mobbin.com/flows/3300eaaf-c006-45e8-ba32-3ea21700b80b.

Uses the existing Missa wordmark, Newsreader heading token, forest primary surface and owned portfolio-still-life media. Icon cards include descriptions, checkbox state, hover border and focus ring; no generated images required. The decorative editorial panel is omitted on smaller screens to keep questions first. Back/selection preservation and skip were exercised at 390px, with no horizontal overflow; reduced-motion mode was exercised. Desktop screenshot inspected. Full screen-reader and native-phone verification remain pending. Account integration is unchanged.

## Image-led choice revision

Supersedes the editorial side-panel composition: six generated discipline images now form the selectable cards in a centered three-column desktop/two-column mobile grid. Asset: public/media/onboarding-practices.png, generated specifically for this preview; rendered as a six-cell CSS sprite without modifying the source. Labels sit on solid surfaces for contrast. Selection reveals optional practice-specific checkboxes, preserves choices on Back, and includes active refinements in the review. Opportunity interests use existing local editorial media. Still a local-state design preview, not canonical taxonomy/account persistence.

Validation: TypeScript and design policy passed; 390px overflow check passed; Writing → Poetry → Continue → Back preserved selection. Desktop rendered cards visually inspected.
