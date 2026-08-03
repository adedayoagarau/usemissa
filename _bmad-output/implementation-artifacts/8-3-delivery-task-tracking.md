---
epic: 8
story: 8.3
status: review
title: Delivery task tracking
---

# Story 8.3: Delivery task tracking

## Delivered

- Accepted-Work guard for creating one DeliveryTask per Work.
- Pending/complete lifecycle with completion timestamps and audit entries.
- Additive `delivery_tasks` Neon/Drizzle schema and reload-safe persistence.
- Admin routes for task creation, listing, and completion; Submission detail response includes tasks for its Works.
- Admin inbox exposes Create delivery task and Mark delivery complete actions for accepted Works.

Delivery tasks remain organization-owned workflow state and do not imply payment, publication, or fulfillment until explicitly completed.
