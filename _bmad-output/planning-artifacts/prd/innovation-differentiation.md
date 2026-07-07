# Innovation & Differentiation

Genuine novelty here, not innovation-theater:

1. **Ports & adapters around a deterministic core, with AI as a pluggable, always-validated adapter** — not "AI-powered" as a marketing veneer over an unvalidated LLM pipeline. This is architecturally real today: `Fetcher`, `Extractor`, `RadarStore`, `Clock` are all ports; the built-in adapters are deterministic/fixture-based, and the production `radar-adapters` package (Playwright + LLM extraction + Postgres) swaps in without touching domain logic. **Validation approach**: every adapter, however sourced, is validated by the same `validateCandidate()` deterministic gate before becoming a canonical fact.
2. **Predictive opening windows from historical cycles** — for opportunities with ≥2 historical cycles, Radar computes a typical opening window and confidence, tested explicitly for the December↔January year-boundary edge case. This is a genuinely useful prediction feature most competitors don't attempt, but it's explicitly labeled as a *prediction with confidence*, never presented as fact — this labeling discipline is itself part of the trust architecture, and any future UI work must preserve it (never render a predicted date as if it were confirmed).
3. **Item-level (Work) decision modeling** — called out above in User Journey 2. **Risk**: this is a data-model decision that has to be made correctly from the start of Workspace development, because retrofitting Submission-level decisions into Work-level after organizations have live data would be a painful migration. **[decision]** flag this as an architecture-review checkpoint before Workspace implementation begins.

**Validation approach for the org side specifically**: because the Workspace product doesn't exist yet, the MVP org-side scope itself is unvalidated against real organizations. The beachhead sequencing (small/mid literary magazines first) exists precisely to validate the riskiest assumption — that a magazine editor will actually migrate off Submittable/Google Forms/email for a v1 Form Builder — before building anything Enterprise-specific.

---
