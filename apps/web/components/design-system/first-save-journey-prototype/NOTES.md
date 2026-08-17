# Selected first-Save journey prototype

Question answered: Which connective pattern best preserves a person’s exact Opportunity and Save intent across authentication, revalidation, canonical Tracker creation, and the first meaningful next action without redesigning the existing Opportunity, auth, or Tracker pages?

## Selected direction

**Focused handoff was selected by the product owner on 16 August 2026.**

The product owner’s reason has not yet been recorded in their own words. The design rationale carried forward is that Focused handoff keeps the public Opportunity fully readable, then gives authentication, revalidation, material-change review, canonical Save receipts, and recovery a quiet task-specific surface. A compact context header preserves the exact Opportunity without leaving the dense public reading page visible beside consequential account and failure states.

The alternatives were removed:

- Inline continuity kept the source object visible but competed with authentication and change-review states.
- Persistent task rail preserved strong context but risked feeling like a tour or onboarding ritual, especially on mobile.

This selection validates a research direction, not production readiness or implementation authority.

## Prototype boundary

This is throwaway UI. It uses synthetic data, keeps all journey state in memory, and performs no authentication, persistence, eligibility decision, recommendation ranking, application submission, domain analytics event, or external-source request. The existing application shell still attempts its global local pageview request; the prototype adds no event call and the local endpoint currently rejects that request with `403`.

Run from the repository root:

```sh
MISSA_ENABLE_FIRST_SAVE_PROTOTYPE=true npm run dev --workspace=@missa/web
```

Open `/design-system/first-save-journey-prototype`.

The route returns not-found unless the server starts with `MISSA_ENABLE_FIRST_SAVE_PROTOTYPE=true`; it is not a promoted review or customer surface.

## Failure-rich fixtures retained

The fixture selector covers new signup, returning login, existing email, incorrect credentials and retry, a changed deadline, a closed Opportunity, lost confirmation response, duplicate Save, cross-device resumption, declined signup, and already-authenticated Save. The amber prototype control returns a simulated server result while `intent_revalidating` is visible.

## Research decision still required

Focused handoff should be tested for Opportunity recognition, private-state comprehension, Save-versus-submit/eligibility distinction, material-change comprehension, recovery confidence, first-action usefulness, mobile burden, and assisted-use parity. Use `MODERATED-TEST.md` for the first formative round.

After research, retain the journey findings and delete or rewrite this throwaway component. Do not promote its code directly into production.
