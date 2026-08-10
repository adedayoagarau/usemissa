# Organization Messages and Delivery visual directions

Date: 8 August 2026

Status: Option 2 selected in the local library and implemented as read-only local Organization routes; mutation and production promotion blocked

Selected review route: `/design-system/organization-messages-delivery`  
Comparison route: `/design-system/organization-messages-delivery-directions`

## Direction 1 — Correspondence ledger

A compact message or accepted-Work ledger opens a durable detail dossier. This is the strongest high-volume audit pattern and remains available as a comparison/reference.

Use when scanning many records matters more than preparing the next action. Avoid turning the ledger into a provider dashboard or exposing raw IDs.

## Direction 2 — Outcome desk — selected

The selected Work and its decision anchor both communication and fulfillment. On Messages, the desk puts the approved external copy, recipient resolution, decision snapshot, and recovery action together. On Delivery, it puts the accepted Work, next obligation, owners, due dates, and evidence-bearing tasks together.

Why selected:

- preserves the Work-level truth needed for mixed Submissions;
- makes a stale decision or withdrawn Work visible before sending;
- keeps partial recipient delivery and correction recovery close to the message;
- adapts cleanly from a desktop split view to a mobile list/detail flow;
- supports Legal and Finance projections without exposing review content;
- can compose premium table, list, badge, alert, form, dialog, and sheet anatomy without letting any one demo dictate the information architecture.

## Direction 3 — Program runbook

Groups correspondence and delivery by Opportunity and phase. It is useful for leadership review and repeated program operations, but it can hide the per-recipient and per-Work evidence needed for corrections. Keep it as a contextual planning reference rather than the transactional default.

## Selected composition

### Messages

- consequence-first message queue;
- selected outcome and immutable preview;
- recipient resolution summary and recipient ledger;
- explicit internal-note boundary;
- approval/schedule/send/correction actions with recovery copy;
- full-page mobile detail after choosing a message.

### Delivery

- accepted-Work queue ordered by blocker and due consequence;
- selected Work dossier and decision snapshot;
- grouped agreement, materials, finance, and publication/program obligations;
- named owner and due date rather than a generic percentage;
- evidence-aware completion and reasoned block/waive/cancel actions;
- full-page mobile detail after choosing a Work.

## Visual rules

- true white canvas;
- Aubergine `#5A3F68` for identity, selection, and focus;
- Lichen for confirmed positive state, Ochre for attention, Mineral Blue for neutral information;
- quiet hairlines and small radius; no decorative card field;
- Ysabeau/Office/SC/Fragment Mono typography contract from Style Guide 2.0;
- 44px mobile controls, visible focus, no hover-only action;
- one page title and one primary action per state;
- all operational claims use words, not color or invented confidence/progress.

## Promotion boundary

The local review route demonstrates the full intended interaction and state contract with fixtures. Canonical local routes now provide customer-safe read-only projections of the smaller durable record that exists today. Neither surface is connected to message sending or Delivery mutations. Mutation or production promotion requires the blockers in `missa-organization-messages-delivery-contract-2026-08-08.md` and separate approval.
