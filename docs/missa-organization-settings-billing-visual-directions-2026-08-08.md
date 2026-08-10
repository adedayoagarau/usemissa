# Missa Organization Settings and Billing visual directions

Date: 8 August 2026  
Status: Option 2 selected in the local library and implemented as a read-only local Organization route; mutations and product promotion blocked  
Selected review route: `/design-system/organization-settings-billing`  
Comparison route: `/design-system/organization-settings-billing-directions`

## 01 — Settings index

A searchable index of settings domains, each with status, authority, and one next action. It is best for first-time setup and discovering what is available, but cross-domain consequences are less visible.

## 02 — Control centre — selected

A focused three-part composition: section navigation, one independently saved settings domain, and a calm status/consequence rail. The mobile transformation is a compact section picker followed by one linear settings page. This is selected because it combines routine editing, honest permissions, and commercial/governance context without producing a card wall.

The canonical local product route uses the same three-part anatomy as a read projection. Because most required mutation contracts do not exist, the focused panel shows current facts or an explicit unavailable state instead of simulated inputs. The selected review and comparison routes remain available for edge-case evaluation.

## 03 — Governance ledger

A dense matrix of settings domains by state, authority, owner, and material change. It is useful for enterprise oversight and audit preparation, but is secondary to everyday configuration.

## Shared visual rules

- true white canvas with Aubergine emphasis;
- Lichen for complete/available, Ochre for attention, Mineral Blue for neutral information, and explicit red only for destructive or failed states;
- settings, commercial state, permission, and provider state remain separate labels;
- every section has its own Save boundary and dirty/pending/success/failure state;
- plan billing and payouts never share one ambiguous card;
- unsupported capabilities are marked as contract targets, not shown as working controls;
- no customer-facing confidence, freshness, source health, worker status, queue status, provider IDs, or raw internal errors;
- destructive flows name consequences and preserve focus;
- all three directions remain available in the local switcher;
- product promotion remains blocked.
