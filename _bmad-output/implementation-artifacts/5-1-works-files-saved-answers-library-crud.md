---
epic: 5
story: 5.1
status: review
title: Works, Files, and Saved Answers Library CRUD
---

# Story 5.1: Works, Files, and Saved Answers Library CRUD

## Story

As a submitter, I want to store reusable Works, Files, and Saved Answers so I do not re-upload or re-type the same material for every submission.

## Scope and contracts

- Library is a private, authenticated user surface at `/library`; it uses Profile/Tracker language and never renders internal Passport or schema vocabulary.
- `LibraryWork`, `LibraryFile`, and `SavedAnswer` are owner-scoped records in `RadarStore`, JSON persistence, and additive Neon tables.
- Work metadata contains a title, optional description, and optional private file reference. File bytes are not stored in Neon; uploads use Vercel Blob private storage when configured and fail closed with a setup message when it is not.
- Saved Answers contain a short name and reusable text body. All fields are bounded and trimmed before persistence.
- API routes derive the owner from the session and return private no-store responses. Cross-user IDs resolve as not found and never reveal another user's Library records.

## API surface

- `GET /api/me/library`
- `POST/PATCH/DELETE /api/me/library/works` and `/works/:id`
- `POST/PATCH/DELETE /api/me/library/saved-answers` and `/saved-answers/:id`
- `POST /api/me/library/files` (multipart upload) and `DELETE /files/:id`

## Design and interaction notes

- True white canvas and existing semantic tokens from `DESIGN.md`; no decorative paper tint.
- Library opens with Works, Files, and Saved Answers tabs, counts, calm empty states, and a clear explanation of reuse.
- Forms use 44px controls, visible labels, inline status/error announcements, keyboard-safe edit/delete actions, and confirm before destructive deletion.
- File cards show metadata only (filename, type, size); raw file content and storage URLs are never rendered into public pages, exports, organization views, or analytics.

## Validation

- Radar engine: 71/71 tests, including owner isolation, validation, file unlinking, and CRUD behavior.
- Adapter: 20 passing, live Postgres integration intentionally skipped; schema/load rehearsal against Neon confirms 1,024 sources, 113 opportunities, 2 users, 2 accounts, and empty Library collections.
- Web: typecheck, lint (two pre-existing opportunities warnings), production build, and Playwright Library E2E pass.

## Follow-ups

- Configure and verify `BLOB_READ_WRITE_TOKEN`/Blob store in Vercel before enabling production uploads.
- Story 5.2 should attach required-material checklists to tracked opportunities and reference Library Works/Files without duplicating records.
- Story 5.3 can add Lists as a separate user-owned relation; it must not overload Library tabs.
