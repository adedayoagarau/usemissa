---
title: Missa Tracker Calendar visual directions
version: "1.0"
status: selected-option-2-local
date: "2026-08-08"
screen_contract: ./missa-calendar-screen-contract-2026-08-08.md
review_route: /design-system/calendar-directions
selected_direction: option-2-month-plus-agenda
selected_review_route: /design-system/calendar
product_promotion_status: blocked
---

# Missa Tracker Calendar visual directions

These three local directions use the same Tracker event contracts and edge-state fixtures. They do not change `/tracker`, `/calendar`, the calendar-feed endpoint, or production.

## 01 — Agenda Ledger

A chronological reading of exact deadlines, submission events, estimated responses, and work without safe dates.

Strengths: clearest narrow-screen reading order; strongest accessibility baseline; easy to scan with large histories. Risk: weaker month-level spatial overview for creators planning several deadlines at once.

## 02 — Month + Agenda — selected

A familiar month grid paired with a selected-day agenda and event detail. Month and Agenda are real switchable modes. At phone width, the selected composition opens in Agenda mode rather than squeezing the full month grid.

Strengths: best balance of spatial planning and readable detail; familiar interaction; selected-day context does not hide rolling, unknown, or conflicting timing. Risk: dense months need event aggregation and must never rely on color alone.

## 03 — Deadline Lanes

A high-volume planning view organized into near deadlines, later deadlines, and response/submission events.

Strengths: strongest urgency planning for creators with many active submissions. Risk: period boundaries are less obvious and it can resemble a second Tracker board.

## Shared contract represented

- active, first-use empty, all-undated, conflicting-date, moved-deadline, dense-month, timezone-boundary, and disconnected-feed fixtures;
- exact deadline, submission event, estimated response, private imported date, rolling timing, unknown timing, and conflict remain distinct;
- no customer-facing confidence, freshness, checked time, queue names, or provider internals;
- private calendar links explain their scope and support copy, rotate, and disconnect intent;
- date-only deadlines do not shift across timezones;
- local desktop runtime QA only; phone/tablet/zoom, keyboard calendar-grid behavior, screen reader, and authenticated integration remain gates.

## Selected direction

Option 2, Month + Agenda, is the selected local Calendar composition. Agenda Ledger is retained as its narrow-screen fallback and explicit alternate mode. Deadline Lanes remains a contextual reference for future high-volume planning, not the default information architecture.

The selection wins because it:

- gives creators a month-level scan without reducing an event to a colored dot;
- pairs the selected date with Tracker stage, linked Work, timing certainty, and one safe next action;
- keeps rolling, unknown, and conflicting timing visible outside the exact-date grid;
- preserves the semantic difference between deadlines, estimated responses, and submission events;
- exposes dense-day aggregation and an Agenda escape hatch;
- treats Calendar as a Tracker view rather than a new standalone product;
- falls back to chronological Agenda reading on narrow screens.

Product promotion remains blocked on URL-backed Tracker view state, typed event lifecycle and conflict behavior, calendar-grid keyboard semantics, feed rotation/revocation APIs, authenticated integration, phone/tablet/zoom and assistive-technology runtime QA, and explicit approval.
