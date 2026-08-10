---
title: Missa Library and Work visual directions
version: "1.0"
status: option-2-selected-and-promoted-locally
date: "2026-08-08"
screen_contract: ./missa-library-work-screen-contract-2026-08-08.md
selected_direction: option-2-working-archive
selected_review_route: /design-system/library-work
product_promotion_status: implemented-local-not-deployed
---

# Missa Library and Work visual directions

Three directions were compared against the same private-Library contract. The selection is a layout and interaction decision, not approval to change `/library` or deploy.

## 01 — Studio Shelf

An image-led Works gallery with generous editorial cards and light metadata. It makes a small, visual practice feel inviting, but it becomes inefficient for creators with many Works, text-led material, several versions, or repeated file retrieval.

Best retained as a future optional gallery view. It is not the Library default.

## 02 — Working Archive — selected

A compact master-detail archive. Search, view navigation, sort, and Work rows stay together on the left; the selected Work opens as a structured dossier on the right. Files, versions, taxonomy by facet, Tracker links, submission snapshots, and archive-first removal stay visible without turning the page into a dashboard.

Why it won:

- strongest retrieval weather across visual, text, sound, performance, and mixed practices;
- scales from four Works to a large private archive;
- keeps Work identity separate from files, versions, Tracker stages, and submissions;
- gives desktop creators useful density while narrow screens become a focused Work page;
- supports Files and Saved Answers without making them subordinate folders;
- preserves the true-white, Aubergine-led system and premium list/form/tab anatomy without importing demo styling;
- makes privacy and submitted-version history explicit without exposing internal freshness or confidence.

Local selection route: `/design-system/library-work`.

## 03 — Submission Memory

A Work dossier led by versions, submitted snapshots, and outcomes. It is valuable inside a selected Work and informed the History panel, but it overweights past applications for first-use, browsing, and everyday retrieval.

Best retained as the Work History view, not the Library default.

## Selected composition

The local Option 2 synthesis adapts:

- `list/list-03` and `list/list-06` anatomy for structured Work and resource rows;
- `tabs/tabs-11` anatomy as ordinary, named Library and Work-detail navigation;
- `input/input-14` anatomy for persistent labelled search;
- `button/button-01` for one contextual Create action and row actions;
- `badge/badge-04` for quiet practice labels;
- `alert/alert-17` plus semantic alert variants for deprecated terms, missing files, version differences, and publication conflicts;
- `form/form-06` and `combobox/combobox-10` as the future editing baseline, after data contracts are implemented;
- Missa-owned master-detail and narrow-screen composition.

The local fixtures cover active, first-use empty, multi-medium, deprecated taxonomy, current-versus-submitted version, missing file, private/public conflict, and 24-record stress states. The selected composition is now promoted locally to `/library` and `/library/works/[workId]` with URL-backed state, real owner-scoped APIs, deletion reference guards, a canonical Work detail, desktop/mobile layouts, and focused Axe/no-overflow checks. It is not deployed. Tablet/zoom breadth, large-inventory pagination, Work versions, archive/restore, and immutable Library-version submission links remain required before the broader lifecycle is complete.
