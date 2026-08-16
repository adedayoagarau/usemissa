---
title: Missa Profile product contract
version: "1.0"
status: implemented-on-feature-branch
date: "2026-08-16"
supersedes:
  - ./missa-profile-screen-contract-2026-08-08.md
selected_review_routes:
  - /design-system/profile-public
  - /design-system/profile-owner
  - /design-system/profile-portfolio
  - /design-system/profile-social-card
product_routes:
  - /@handle
  - /profile
  - /settings
release_status: migration-and-production-verification-required
---

# Missa Profile product contract

Profile is the public page a person chooses to share. Settings holds private
preferences and account controls. The two surfaces use the same identity but do
not expose the same information.

The public page should answer five questions in order:

1. Who is this person?
2. What do they make?
3. Can I experience one Work now?
4. What else have they made or published?
5. How can I reach or follow them?

Profile is a portfolio, not a social feed. It has no followers, reactions,
scores, view counts, endorsements, Tracker activity, application history, or
eligibility information.

## 1. Information architecture

### Public Profile — `/@handle`

- profile photo;
- name and handle;
- creator-written headline and one-line introduction;
- one selected Work with an optional passage, image, audio, or video sample;
- more public Works;
- About;
- Open to;
- Links;
- private contact relay;
- Share menu;
- Profile-specific social preview image;
- report control.

Only explicitly published information appears. A missing value is omitted; the
page does not render an empty card or reveal that a private value exists.

### Owner Profile — `/profile`

The owner edits the public page in place. They can claim or rename a handle,
upload a photo, edit public identity, choose Works from Library, publish one
sample, add links, allow contact, reorder Works, preview the visitor view,
publish, or unpublish.

Removing a Work from Profile does not delete it from Library. Unpublishing a
sample removes its public copy and leaves the private Library file intact.

### Settings — `/settings`

- public Profile entry and privacy summary;
- private opportunity preferences;
- notifications and timezone;
- email, Gmail, forwarding, and calendar connections;
- saved searches and followed organizations;
- export and Tracker import;
- password and account deletion.

Private preferences do not appear on the public Profile and are not saved with
public Profile edits.

## 2. Sources of truth

| Information | Source of truth | Profile behaviour |
| --- | --- | --- |
| Handle | Handle namespace | Consumed by Profile; required before first publish |
| Public identity | Profile publication record | Rendered only after explicit publish |
| Work identity and private files | Library | Profile stores the public selection and public sample copy |
| Opportunity details | Opportunity record | Never copied into Profile |
| Submission activity and outcomes | Tracker | Never rendered on Profile |
| Private recommendation choices | Settings | Used privately; never mirrored onto Profile |
| Per-opportunity reminders | Tracker | Kept separate from global notification defaults |

## 3. Publication and privacy

- Profile is private until the owner publishes it.
- Production publishing requires a claimed handle.
- `/profile/[userId]` is compatibility-only and redirects to `/@handle` in
  production.
- Owner routes and mutations are session-derived and `private, no-store`.
- Public projection fails closed for unknown privacy keys.
- Creator-supplied outbound links use `rel="nofollow ugc"`.
- Contact messages use a relay; the creator's email is never returned to the
  visitor.
- Public structured data contains only facts rendered on the page.
- A Profile remains `noindex, follow` until it has a one-line introduction and
  either a selected sample or at least two public Works.

Profile does not display labels that try to prove or rank a Work. Do not render
verification ticks, evidence chips, confidence, freshness, source tiers, or
internal processing language.

## 4. Media

- Text publishes a bounded passage, not the whole private Work.
- Image, audio, and video samples publish from a Library file to a separate
  public asset.
- Audio and video use native media elements with a custom Missa control
  surface. No autoplay.
- Images require a public description.
- Video provides a captions or transcript path; audio that includes speech
  provides a transcript path.
- Unpublish removes the public asset reference without changing the Library
  record.

## 5. Account lifecycle

- Password changes require the current password and invalidate other Missa
  sessions.
- Calendar subscription links can be created, rotated, and revoked.
- Notification defaults control email delivery, deadline reminders, and
  timezone without exposing those choices publicly.
- Account deletion requires exact confirmation and the current password where
  applicable.
- A sole organization owner must transfer ownership first.
- Submitted applications and completed reviews remain as deidentified
  organization records. Drafts, Profile, Library, personal Tracker data,
  connections, and creator-owned files are removed.
- Deletion runs through a durable retry queue before the session is cleared.
- If Neon Auth removes the sign-in identity before the queue records that
  stage, the worker resumes only after Neon’s auth tables show that the
  identity is gone.
- Public `/@handle` visits enter the first-party page-view ledger. Deleted
  handles remain held for 90 days; handles with meaningful traffic or
  permanent aliases remain unavailable.

## 6. Component authority

Shipped code composes from `apps/web/components/ui/`. Premium files under
`apps/web/components/shadcn-studio/` are anatomy references only and are never
imported into the product.

- identity uses `Item`, `ItemMedia`, and `ItemContent`;
- Works and links use `ItemGroup`, `Item`, and `ItemSeparator`;
- photos use `Avatar` with a rectangular presentation and initials fallback;
- public media uses `AspectRatio` and native media elements;
- destructive actions use `AlertDialog`;
- publish and save confirmation use `Sonner`;
- mobile Work editing uses `Collapsible`;
- Work ordering uses `Sortable`.

## 7. Review and release gates

The review routes must render the public page at 390px and 1280px, the owner
editor at both widths, and all sixteen contract fixtures. Serious and critical
accessibility findings must be zero in the tested states.

Before production release:

1. verify production migration state, then review and apply any pending
   migrations among `0026`, `0028`, and `0029` in order;
2. verify the handle namespace and account-deletion queue against production
   Postgres;
3. publish and unpublish a real image, audio, or video sample using production
   Blob storage and confirm the private Library file remains;
4. verify Profile contact delivery, calendar rotation, password invalidation,
   and account deletion with real authentication accounts;
5. approve the public and owner review routes;
6. merge and deploy only after those checks pass.
