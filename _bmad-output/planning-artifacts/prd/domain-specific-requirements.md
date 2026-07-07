# Domain-Specific Requirements

This isn't a regulated domain in the compliance sense, but it has real domain-specific obligations the strategy doc calls out:

- **Anti-fraud in the intelligence layer.** The extractor must flag suspicious payment language ("wire transfer," "gift cards," "processing fee to receive prize") as trust-score penalties — **implemented** in `extraction/signals.ts` and exercised by `extractor flags rolling deadlines and suspicious language` in the test suite. This must never regress as new extraction adapters (LLM-based) are added — the LLM extractor output is explicitly still validated through `validateCandidate()`, per the consolidated `radar-adapters` package.
- **Fairness in review workflows** (not yet built): once the Review/Decision system exists, decisions must be auditable — who reviewed what, when a decision was made, whether blind-review rules were honored. The strategy doc's Delivery/Decision sections imply this but don't yet specify an audit-log requirement for review actions specifically (distinct from the account/admin audit log already implemented in `auth/audit.ts`, which only covers auth/claim actions today).
- **Payment handling** (not yet built): Stripe + Stripe Connect for organization fee collection, 1.5%-capped-at-$1.50 Missa take rate. No payment code exists in any branch today — this is pure strategy-doc scope.
- **Accessibility for a broad creative community**: submitters span career stages, ages, and technical comfort levels — this pushes accessibility from "nice to have" into an actual NFR (see Non-Functional Requirements).
- **Data portability as a trust commitment**: organizations and submitters must be able to export their data (CSV, and eventually full migration exports) — this is both a competitive differentiator (per strategy doc positioning against lock-in-heavy incumbents) and a stated non-negotiable, not a growth-feature nicety, even though the underlying Import/Migration *stack* is scoped as Growth.

---
