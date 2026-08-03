# Story 3.6: Work-based Tracker view

Status: done

Tracked opportunities can be linked to a private Library Work. The Tracker now
groups linked rows under Works (with an Unassigned group), exposes an owner-only
link/unlink endpoint, and validates that both the tracked row and Work belong to
the signed-in submitter. Links persist with the existing Radar snapshot and are
included in the engine's tracker projection without exposing Library data.

Validation: Radar engine tests cover linking, grouping, and cross-user rejection;
web typecheck and production build pass.
