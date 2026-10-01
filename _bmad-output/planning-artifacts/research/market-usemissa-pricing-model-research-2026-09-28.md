---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - 'https://www.purchasely.com/blog/app-pricing-models'
  - 'https://www.businessofapps.com/insights/how-to-create-pricing-strategies-for-your-app-to-maximize-your-revenue/'
  - 'https://blog.zach.so/p/a-comprehensive-guide-to-app-pricing'
workflowType: 'research'
lastStep: 6
research_type: 'market'
research_topic: 'Missa pricing model'
research_goals: 'Choose an evidence-led monetization architecture for creators and organizations that supports sustainable revenue without weakening discovery access, trust, or global affordability.'
user_name: 'Adedayo'
date: '2026-09-28'
web_research_enabled: true
source_verification: true
---

# Research Report: market

**Date:** 2026-09-28
**Author:** Adedayo
**Research Type:** market

---

## Research Overview

Missa's monetization question is whether a single subscription can responsibly fund a product whose two sides pay for different things at different scales. Creators are mostly price- and time-constrained, and their durable willingness to pay rests on workflow leverage and concrete savings, not on being allowed to reach an official opportunity. Organizations split by operational scale: community publishers need seasonal, low-commitment, usage-sensitive pricing, while professional programs and regulated institutions pay for reliable end-to-end operations, governance, and support. The evidence supports a hybrid architecture, not one universal plan, anchored on keeping source trust and discovery free, charging creators only for recurring leverage, charging community publishers by active cycle or volume, charging professional programs annually, and quoting institutions separately.

The repository already contains an organization-scoped billing scaffold with Free, Indie, Pro, Program, and Enterprise plan metadata, Stripe Checkout and signed webhooks, and role-gated billing visibility. This research reconciles that scaffold with the external evidence rather than proposing a clean-slate model. The strongest findings concern segment boundaries and pricing principles; exact prices remain hypotheses because Missa has no paid-conversion, willingness-to-pay, retention, or payment-failure cohort yet. The closing synthesis therefore recommends a phased validation plan ahead of any paywall, and marks every draft price as provisional.

---

<!-- Content will be appended sequentially through research workflow steps -->

# Market Research: Missa pricing model

## Research Initialization

### Research Understanding Proposed

**Topic**: A pricing and monetization model for Missa
**Goals**: Choose an evidence-led monetization architecture for creators and organizations that supports sustainable revenue without weakening discovery access, trust, or global affordability.
**Research Type**: Market Research
**Date**: 2026-09-28

### Research Scope

**Market Analysis Focus Areas:**

- Segment creators, organizations, and any transaction-specific payer rather than assuming one customer and one subscription.
- Define which parts of Discover → Evaluate → Save → Prepare → Apply → Confirm → Track → Outcome should remain free, become paid, or support usage-based pricing.
- Compare freemium, subscription, tiered, usage-based, transaction, and hybrid models against Missa’s actual product value and trust boundaries.
- Examine willingness-to-pay signals, substitutes, competitor packaging, geographic purchasing-power differences, and student/emerging-creator affordability.
- Model creator and organization unit economics, price fences, entitlements, annual discounts, trials, and launch experiments.
- Recommend an initial pricing hypothesis and a validation plan rather than presenting untested prices as settled truth.

**Research Methodology:**

- Use the three supplied articles as framing inputs and verify important claims against primary or current authoritative sources.
- Inspect Missa’s current product contracts and operating costs separately from external market research.
- Compare direct and adjacent competitors by buyer, job-to-be-done, price metric, packaging, and geographic fit.
- Distinguish observed market facts, repository evidence, strategic inference, and assumptions requiring interviews or experiments.
- Assess confidence and preserve uncertainty where current usage, retention, or willingness-to-pay data is unavailable.

### Proposed Research Decisions

The work should answer five decisions:

1. Who should pay first: creators, organizations, transaction participants, or a combination?
2. What is Missa’s durable value metric for each payer?
3. What must stay free to preserve discovery, access, and network growth?
4. What launch packages and provisional price ranges are credible by geography?
5. What evidence must be collected before enabling a paywall or billing customers?

### Next Steps

**Research Workflow:**

1. ✅ Initialization and scope setting (current step; awaiting confirmation)
2. Customer segments, jobs, behavior, and willingness-to-pay hypotheses
3. Competitive pricing and packaging landscape
4. Cost structure, value metrics, and monetization architecture
5. Price hypotheses, sensitivity ranges, and validation experiments
6. Strategic synthesis and phased recommendation

**Research Status**: Scope confirmed by Adedayo on 2026-09-28; detailed market research in progress.

**Scope confirmation**: Confirmed by user on 2026-09-28.

## Customer Behavior and Segments

### Research Coverage and Evidence Quality

This section combines four evidence classes and does not treat them as interchangeable:

1. **Current Missa repository evidence** defines the intended product jobs and lifecycle. It does not establish market demand or willingness to pay.
2. **Primary and authoritative research** establishes economic and behavioral constraints affecting creators, students, artists, and nonprofit buyers.
3. **Current competitor packaging** provides revealed market offers, but a published price is not proof of conversion, retention, or willingness to pay.
4. **Vendor case studies and general subscription benchmarks** provide directional signals only; their outcomes are not independently audited and their samples are not Missa users.

The strongest evidence supports segment boundaries and pricing principles. There is still no direct Missa customer willingness-to-pay dataset, price-elasticity curve, paid conversion cohort, or renewal cohort. The current analytics contract measures the creator lifecycle but contains no pricing, paywall, trial, checkout, or subscription events. Any exact Missa price remains a hypothesis until interviews and live tests supply those missing observations.

The supplied [Purchasely guide](https://www.purchasely.com/blog/app-pricing-models) usefully frames free, freemium, paid, and paymium models and recommends competitor analysis, price-sensitivity research, and testing. It is also subscription-vendor content, so its preference for subscriptions is not treated as neutral evidence. [Zach So's guide](https://blog.zach.so/p/a-comprehensive-guide-to-app-pricing) correctly emphasizes event analytics and iterative testing, but its thresholds and tactics are one developer's experience rather than a market standard. The supplied Business of Apps URL could not be fetched reliably in this research pass; no claim from it is used without separate support.

### Customer Behavior Patterns

#### Creators and applicants

Creator behavior is shaped by irregular income, uncertain outcomes, deadline bursts, and repeated application effort. In the Authors Guild's US survey of 5,699 published authors, median 2022 income among all full- and part-time respondents was $2,000 from books and $5,000 from all author-related work. Full-time Black authors reported substantially lower median book income than white authors. This is not a global creator-income census, but it is strong evidence against assuming that a professional creative identity implies discretionary subscription income. ([Authors Guild](https://authorsguild.org/news/key-takeaways-from-2023-author-income-survey/))

US labor data show artists are more likely than the total labor force to work part time or hold second jobs; in 2024, 23% of artists worked part time and 9% held a second job. Writers were also more likely than the total labor force to report variable hours. The relevant behavioral consequence is fragmented time and episodic attention, not simply low income. ([National Endowment for the Arts](https://www.arts.gov/sites/default/files/a5-report-202509.pdf))

Applications themselves consume meaningful time. GrantStation's 2024 survey reported that writing the largest grant application took more than three days for 57% of respondents. Even a foundation that deliberately simplified its creative-bursary process found that one-third of surveyed recipients spent 11–15 hours applying. ([GrantStation](https://grantstation.com/sites/default/files/imageLibrary/SoG/The%202024%20State%20of%20Grantseeking%20Report.pdf), [The Supporting Act Foundation](https://thesupportingact.org/news/first-survey-results))

Active applicants therefore optimize for four things:

- trustworthy relevance before investing effort;
- clarity about eligibility, requirements, fees, and deadlines;
- reuse of work across multiple applications;
- a durable record of what was prepared, sent, confirmed, and decided.

The category already exhibits repeated tracking behavior. Chill Subs publicly reports more than 97,000 registered writers and more than 393,000 tracked submissions. That validates the job, not Missa's ability to monetize it. ([Chill Subs](https://www.chillsubs.com/))

_Behavior drivers:_ reduce wasted applications, avoid missed deadlines, protect creative time, and preserve a trustworthy application history.

_Interaction preferences:_ free public evaluation first; mobile-friendly quick checks; deeper desktop preparation; reminders and return visits clustered around open-call seasons.

_Decision habits:_ creators compare expected benefit against application time, entry fees, eligibility confidence, and probability of fit. They will not reliably value a larger feed if it increases evaluation burden.

#### Organization operators

Organization behavior is split by operational scale. Small literary magazines and presses often have very small budgets and teams: CLMP's field study found 76% of surveyed nonprofit literary organizations had budgets below $250,000, 74% had three or fewer paid staff, and 80% had no or insufficient cash reserves. ([CLMP](https://www.clmp.org/press-center/first-of-its-kind-report-on-the-u-s-literary-arts-field/))

The wider nonprofit sector buys technology under budget and staffing constraints. NTEN's 2024 survey found 45% believed their organization spent too little on technology; among them, 77% cited available budget as a barrier. Yet more than 90% gave at least some priority to program/service delivery, fundraising/financial stability, and community engagement. This means Missa must sell an operational outcome, not a collection of features. ([NTEN](https://word.nten.org/wp-content/uploads/2024/04/2024-Nonprofit-Digital-Investments-Report.pdf))

Small organizations usually behave as seasonal, self-serve buyers: they need quick setup, low commitment, support for volunteer reviewers, and no punitive bill while a call is closed. Mid-sized programs will pay materially more when the system replaces spreadsheets and email, standardizes review, reduces incomplete applications, and produces defensible reporting. Foundations, universities, governments, and other regulated funders add security, migration, procurement, finance, integration, accessibility, and service-level review to the buying process.

_Behavior drivers:_ staff-time savings, fewer process errors, better applicant experience, transparent review, and auditable program records.

_Interaction preferences:_ self-service and reversible setup for small organizations; demos, sandbox evaluation, migration plans, invoicing, and contractual review for institutions.

_Decision habits:_ an operator can champion the product, but leadership, board, finance, IT/security, legal, or procurement may control the purchase as spend and risk increase.

### Demographic Segmentation

Demographics should inform access design and research sampling, not become crude price fences.

**Age and career stage.** The useful distinction is not age alone. Students, emerging creators, established independent professionals, and institutional employees may have very different resources at the same age. The Hope Center's 2023–24 US student survey found 59% of respondents experienced food or housing insecurity, demonstrating why a student discount cannot substitute for a genuinely useful free tier or sponsored access. ([Hope Center](https://hope.temple.edu/research/hope-center-basic-needs-survey/2023-2024-student-basic-needs-survey-report))

**Income and work pattern.** Creator income is frequently low, variable, or supplemented by other work. Small literary organizations can also be financially precarious. The price-sensitive side of Missa therefore includes both individual applicants and mission-driven organizations; B2C versus B2B is not a sufficient affordability distinction.

**Geography and purchasing power.** A single USD price would create unequal affordability. World Bank 2024 purchasing-power-adjusted GNI per capita was $8,850 for Nigeria, compared with $61,460 in the UK, $63,433 in the EU, and $85,980 in the US. These are national averages, not creator incomes or willingness-to-pay measures, but the magnitude rules out straight foreign-exchange conversion as an equity strategy. ([World Bank](https://datacatalogfiles.worldbank.org/ddh-published/0038128/DR0046435/GNIPC.pdf))

Payment access also differs within a country. The 2025 Global Findex Nigeria dashboard reports material account-access gaps by gender and income group. CBN channel data show that Nigeria is digitally active, but automated direct debit represented a very small share of H1 2024 payment volume compared with web transfers, POS, and mobile channels. A failed card or lack of recurring-debit access must not be interpreted as lack of product demand. ([World Bank Global Findex](https://digitalfinance.worldbank.org/country/nigeria), [Central Bank of Nigeria](https://www.cbn.gov.ng/PaymentsSystem/ePaymentStatistics.html))

**Education.** Education level is relevant to some opportunity types but is not a defensible proxy for ability or willingness to pay. Research should instead sample by opportunity goal, career stage, application frequency, income stability, geography, and current tracking method.

_Confidence:_ high that affordability and payment access vary substantially; low that any public macroeconomic indicator predicts Missa conversion.

### Psychographic Profiles

These profiles are reasoned hypotheses derived from observed jobs and external research, not measured personality clusters.

**The access-first explorer** values openness, fairness, legitimacy, and low commitment. They may be new to applications or uncertain whether an opportunity is meant for them. A paywall before relevance and trust are established would be experienced as another gatekeeper.

**The deliberate repeat applicant** values control, time efficiency, evidence, and continuity. They are willing to build a system because they apply often enough for reminders, reusable material, comparison, and history to compound. This is the creator segment most plausible for optional paid workflow leverage.

**The community operator** values service to applicants and keeping a small organization functioning with limited staff. They dislike enterprise complexity and fixed costs that continue through closed seasons. They need the product to reduce work immediately.

**The accountable program operator** values consistency, defensibility, reporting, and dependable execution across a cycle. They can justify a larger budget when Missa reduces staff hours and operational risk.

**The institutional risk buyer** values implementation certainty, security, migration, integration, accessibility, support, and contractual accountability. Features alone do not close this purchase.

_Values and beliefs:_ creators prioritize access, autonomy, trust, and a fair exchange for scarce time; organizations prioritize mission delivery, applicant experience, operational control, and defensible decisions.

_Attitudes toward payment:_ creators are most likely to pay after recurring personal value is visible; organizations are most likely to pay when the outcome can be expressed as time saved, capacity gained, risk reduced, or a complete program cycle delivered.

### Customer Segment Profiles

| Segment | Core job | Current substitute | Payment posture | Initial pricing implication | Confidence |
| --- | --- | --- | --- | --- | --- |
| Access-first creator | Find and assess legitimate opportunities | Search, social media, newsletters, bookmarks | Very low; value not yet proven | Keep trustworthy discovery, official links, core facts, and basic Save free | High on need; low on conversion |
| Repeat applicant | Coordinate several active applications and materials | Spreadsheet, calendar, notes, cloud folders, Duotrope/Chill Subs | Plausible if recurring time savings are clear | Test an optional seasonal/monthly workflow tier; do not sell outcome probability | Medium |
| Student or access-constrained creator | Find scholarships, grants, fellowships, and early-career opportunities | School resources, social media, general search | Low or payment-constrained | Free tier plus sponsored/institutional access; regional payment options | High on constraint |
| Community publisher | Open a call, receive submissions, coordinate volunteer review | Email, forms, spreadsheets, free/low-cost submission tools | Price-sensitive and seasonal | Free/very-low base, prepaid or usage-based active-cycle pricing; archive access while closed | High |
| Professional program | Run recurring awards, grants, residencies, or scholarships | Forms plus spreadsheets or mid-market application software | Will pay for saved time and reliable operations | Annual/cycle plan with generous included volume; advanced workflow and support as fences | High |
| Institutional funder | Operate multiple high-stakes programs under governance requirements | Enterprise grants/awards system | Procurement-led; budget tied to risk and scope | Quote-based subscription plus implementation/migration/support | High on behavior; medium on price |

Current market packaging reinforces the segment split. Submittable Discover keeps applicant discovery free. Duotrope charges $6/month or $60/year for deeper market intelligence and tracking. FilmFreeway Gold charges more but connects payment to direct entry-fee savings. These offers support a principle—charge creators for workflow leverage or concrete savings, not merely for reaching an official opportunity—but do not establish Missa's price. ([Submittable Discover](https://www.submittable.com/discover), [Duotrope](https://duotrope.com/about/payment.aspx), [FilmFreeway Gold](https://filmfreeway.com/help/article/16081/gold-faq-submitters))

### Behavior Drivers and Influences

**Emotional drivers.** Creators want relief from uncertainty without being manipulated by false fit or success claims. Organizations want confidence that nothing has been lost, misrouted, inconsistently reviewed, or communicated without authority.

**Rational drivers.** The creator calculation is time saved plus avoided fees or missed deadlines, not the nominal number of listings. The organization calculation is staff hours, cycle capacity, application completion, error reduction, auditability, and support burden.

**Social influences.** Recommendations from trusted creative communities, universities, funders, publishers, and professional associations can reduce adoption risk. Sponsored access may be more credible and inclusive than a public discount code.

**Economic influences.** Irregular income, weak currencies, payment access, data cost, and seasonal use all change effective affordability. Regional pricing is technically feasible, but automatic currency conversion is not the same as purchasing-power localization. RevenueCat's 2026 benchmark found materially different subscription prices and conversion across regions; it is a cross-category app benchmark, not a Missa forecast. ([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps))

**Payment behavior.** Paystack currently supports cards and Nigerian direct debit for recurring subscriptions, while its broader one-time checkout supports additional rails. For Nigeria, a non-renewing 30- or 90-day pass may therefore reach users whom an auto-renewing subscription cannot. This needs checkout testing and legal/tax review before implementation. ([Paystack subscriptions](https://paystack.com/docs/payments/subscriptions/), [Paystack pricing](https://paystack.com/pricing))

### Customer Interaction Patterns

**Research and discovery.** Creators arrive from search, social links, partners, organizations, and shared opportunities. They first need enough public evidence to decide whether further effort is rational. Organizations often encounter software after operational pain becomes acute: a new cycle, rising volume, reviewer coordination failure, reporting needs, or a migration trigger.

**Purchase decision process.** A creator should experience recurring value before encountering a paid workflow offer. A small organization may decide during a trial or one live cycle. A regulated institution may take months to evaluate security, workflow fit, migration, implementation, support, and terms.

**Post-purchase behavior.** Creator use and organization intake can be seasonal. Easy cancellation, pausing, short-duration access, grace periods, and preserved read-only history are more aligned with the job than forced annual lock-in. Closed intake must not make past submissions, decisions, or audit history inaccessible.

**Loyalty and retention.** Retention should come from accumulated trustworthy history, reusable material, smooth repeated cycles, and measured time savings—not from data lock-in. Exports and migration assistance can be paid services while data portability remains a trust feature.

### Cross-Behavior Analysis

The central pattern is that both sides pay for **reduced coordination cost**, but at different scales:

- creators may pay to reduce repeated personal effort across many uncertain applications;
- community publishers may pay only during active cycles or by volume;
- professional programs pay for reliable end-to-end operations;
- institutions pay additionally for implementation certainty, governance, and support.

This points toward a hybrid architecture rather than one universal subscription. The strongest current hypothesis is free source-trust and basic creator continuity, optional creator workflow leverage, usage/cycle-sensitive community organization pricing, annual professional program pricing, and quote-based institutional services.

### Quality Assessment and Open Questions

**High-confidence findings:** creator income and time are constrained; small arts organizations are budget constrained; program operators value efficiency and service delivery; geography and payment access materially affect affordability; organization procurement changes with operational risk.

**Medium-confidence inferences:** repeat applicants will pay for advanced workflow; community publishers prefer usage or active-cycle pricing; short creator passes will outperform annual-only subscriptions in some markets.

**Unknown and requiring direct Missa evidence:** creator conversion at any price, feature-level willingness to pay, retention by opportunity type, Nigeria-specific creator price sensitivity, organization renewal, support cost, payment failure rates, and whether a creator tier improves or damages the network and trust loop.

The next research stage should compare direct competitors and substitutes by payer, free boundary, value metric, price, seasonality, geographic treatment, and evidence quality before any Missa price card is drafted.

## Competitive Pricing and Packaging Landscape

### Evidence Quality and Currency

Competitor price pages are largely JavaScript-rendered and several are Cloudflare-gated, so live scraping in this pass returned only structural signals, not clean price tables. Submittable Discover is live-confirmed as a free applicant marketplace. Duotrope and FilmFreeway Gold figures are carried from the prior session's verified sources with an as-of date of 2026-09-28; both are drift-prone. Organization-plan prices for Submittable and Zealous are not independently re-verified here and are treated as structural facts (quote/custom, organization payer) rather than settled numbers. No competitor price below is a Missa conversion or willingness-to-pay observation.

### Competitor and Substitute Map

| Product | Payer | Core job served | Free boundary | Value metric | Price posture | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Submittable (platform) | Organization | Collect and review submissions/applications | None meaningful for orgs; applicant Discover stays free | Program operations | Custom/quote; "Enterprise Plan" surfaced on page | Live structural; price not re-verified |
| Submittable Discover | Applicant | Find and apply | Discovery and application are free | Access | $0 | Live-confirmed free marketplace |
| Zealous | Organization | Run awards/grants with review workflow | Limited free tier | Program operations | Tiered; quote for volume | Structural; price not re-verified |
| Duotrope | Creator | Market intelligence + submission tracking | Partial; core paid | Discovery depth + tracking | $6/month or $60/year | As-of 2026-09-28, cited |
| Chill Subs | Creator | Track submissions, community support | Free base | Tracking + community | Free with optional support | Cited (97k writers, 393k tracked) |
| FilmFreeway Gold | Creator | Entry + festival submissions | Basic entry free | Entry-fee savings | Higher-tier; Gold connects to discounts | As-of 2026-09-28, cited |
| Artwork Archive / EntryThingy / SmarterSelect | Organization | Niche submission or review management | Varied | Niche operations | Tiered/quote | Secondary; not re-verified |
| Google Forms / Typeform / Jotform | Organization | Collect responses | Free/low-cost | Form collection | Free to low monthly | Live structural |
| Airtable / Notion | Organization | Manual workflow/DB replacement | Free tier | Coordination | Per-seat | Live structural |

### Value-Metric Patterns

Creator-side tools monetize two distinct things, and neither is "reach an official opportunity": workflow leverage (Duotrope tracking and market intelligence, Chill Subs submission tracking) and concrete savings (FilmFreeway Gold entry-fee discounts). This is the single most transferable pattern. A creator will not reliably pay merely to see an opportunity they could also reach directly; they may pay once recurring personal effort compounds into saved time, avoided fees, and a durable record.

Organization-side tools monetize operations, priced either per-program or as a quote. The free manual substitute (forms plus spreadsheets plus email) is the real competitor at the low end, and it is cheap but error-prone; the enterprise substitute (custom or Submittable-class systems) is expensive and procurement-heavy. That leaves an underserved middle: the very small, seasonal, mission-driven program that needs review structure and an applicant portal but cannot carry a fixed annual enterprise bill.

### Free-Boundary and Seasonality Patterns

Discovery and basic access stay free across the creator side, with paid fences on depth and leverage. On the organization side, the notable gap is seasonality: intake is often periodic, yet most platforms price on a continuous subscription, forcing closed seasons to either keep paying or lose history. This supports Missa's intuition that community-publisher pricing should be prepaid, usage-based, or cycle-scoped, with read-only archive access retained while a call is closed.

### Geographic and Affordability Treatment

The incumbents do not meaningfully localize by purchasing power. Duotrope's flat USD fee and FilmFreeway's flat Gold tier are de facto barriers in weaker-currency markets, and none of the sampled tools is notable for regional passes, sponsored access, or local recurring-debit support. Payment rails differ materially: Paystack recurring subscriptions in Nigeria are card- or direct-debit-bound, while its one-time checkout reaches additional rails, so a non-renewing 30- or 90-day pass may reach users an auto-renewing subscription cannot. This is an explicit, addressable gap, not an assumption that a cheaper global price will clear.

### Competitive Gap and Confidence

The unserved space is the intersection of source-governed trust, full lifecycle continuity (Discover → Evaluate → Save → Prepare → Apply → Confirm → Track → Outcome), and genuine global affordability. Competitors cover organization operations or creator tracking, but not the trust-and-official-destination boundary, and not affordable global access. Confidence is high that the gap exists; it is low that any specific Missa price will convert, because no competitor price is a Missa willingness-to-pay observation.

## Cost Structure, Value Metrics, and Monetization Architecture

### Current Missa Cost Structure (repository evidence)

Missa's durable operating costs come from ingestion and freshness work, Postgres storage and query load, the Upstash Redis cache layer, provider/API and email delivery, and the hosted application runtime. The existing billing boundary is already Stripe-hosted: Missa never receives card details, and the route fails closed when `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*`, or `STRIPE_WEBHOOK_SECRET` are absent. This means the marginal cost of a paid tier is dominated by support, review/ops features, storage for high-volume programs, and provider-pass-through, not by card handling. These are repository facts about how billing is wired today, not a market demand statement.

### Durable Value Metrics per Payer

| Payer | Durable value metric | Why it is durable |
| --- | --- | --- |
| Creator (repeat applicant) | Active application/reminder volume and reusable material | Value compounds with repeated use, not with feed size |
| Community publisher | Applications received per active cycle | Scales with intake, tracks the seasonal job |
| Professional program | Managed end-to-end program cycle | Value is staff time saved and defensible operations |
| Institutional funder | Governed multi-program operation | Value is risk, integration, and compliance coverage |

The feed/listing count is deliberately not a value metric: a larger feed increases evaluation burden, so charging for it would misalign price with value and weaken trust.

### Recommended Hybrid Architecture

- Free: source trust, discovery, official links, core facts, basic Save and lifecycle continuity.
- Creator leverage: an optional, short-duration (monthly/seasonal) workflow tier for reminders, reusable material, comparison, and history at scale.
- Community publisher: prepaid or usage-based active-cycle pricing with a very low base and read-only archive while closed.
- Professional program: annual/cycle plan with generous included volume and advanced review/reporting as the fence.
- Institutional: quote-based subscription plus implementation, migration, security, and support.

This maps onto the repository's existing Free/Indie/Pro/Program/Enterprise metadata without changing the scaffold's shape; the work ahead is entitlement mapping, pricing experiments, and payment rails, not a rebuild of the billing boundary.

### Reconciliation with the Existing Billing Scaffold

The scaffold already separates plan metadata, seat limits, Stripe checkout, webhook handling, and a fail-closed path. The pricing research does not require new billing primitives; it requires assigning credible entitlements and provisional prices to the existing tiers and confirming which rail each geography can actually renew on. The "Indie" and "Pro" tiers are the natural home for creator leverage and professional programs respectively, "Program" for cycle-scoped community publishing, and "Enterprise" for the quote-based institutional path, but those labels must be validated against real behavior, not asserted as final.

## Price Hypotheses, Sensitivity Ranges, and Validation Experiments

### Provisional Price Cards (hypotheses, not settled)

Every figure below is a hypothesis for testing and is explicitly not a production price. It is grounded in competitor packaging and the segment analysis, not in Missa conversion data.

| Offer | Payer | Provisional range | Rationale and fence |
| --- | --- | --- | --- |
| Creator leverage | Repeat applicant | USD-equivalent $3-8/month, or a non-renewing 30/90-day pass | Tracks Duotrope's $6/month while leaving discovery free; pass form reaches weak-currency and direct-debit-limited markets |
| Community publisher | Small organization | Low base plus usage by active cycle, or a prepaid cycle pass | Seasonality and the free-forms substitute set the ceiling |
| Professional program | Mid-size program | Annual plan with generous included volume | Replaces spreadsheets and email; priced against saved staff hours |
| Institutional | Funder/university/government | Quote-based | Procurement, security, migration, and support set the price |

These ranges are sensitivity bands for experiments, not a launch card. Regional pricing should use purchasing-power parity as a directional input, not a straight foreign-exchange conversion; a single flat USD price would reproduce the affordability gap the incumbents leave open.

### Validation Experiments (pre-paywall)

1. Willingness-to-pay interviews with repeat applicants, community publishers, and program operators, sampled by opportunity goal, application frequency, income stability, and geography.
2. A fake-door test on the creator leverage tier to measure intent without collecting payment.
3. A small paid pilot with real payment rails in one region, measuring activation, renewal, and payment-failure rates.
4. Organization-cycle pilots with one or two community publishers to observe seasonal usage and closed-cycle archive behavior.

None of these is evidence of conversion until it runs. A price card should not be published before at least interviews plus one live pilot produce observed conversion and renewal.

## Strategic Synthesis and Phased Recommendation

### Summary of Key Findings

Creators and organizations both pay for reduced coordination cost, but at different scales and with different free boundaries. Discovery and source trust must stay free; creator monetization should target recurring workflow leverage and concrete savings; community publishers should be priced by active cycle; professional programs annually; institutions by quote. The incumbents validate these fences but do not localize by purchasing power, which is Missa's clearest differentiation opportunity and its clearest equity obligation.

### Phased Recommendation

- Phase 1 (no paywall): ship the entitlement mapping on the existing scaffold, instrument pricing/paywall/trial/checkout events, and run willingness-to-pay interviews plus a creator fake-door test.
- Phase 2 (bounded paywall): run one regional creator-leverage pilot and one community-publisher cycle pilot on real rails, with exports and read-only history as trust-preserving defaults.
- Phase 3 (scale): expand to professional programs, then institutional quotes, only as observed conversion and renewal justify it.

### Risks and Open Questions

The largest risk is that a creator tier damages the trust-and-discovery loop if it appears to gate access or promise outcome probability. The largest unknowns are creator conversion at any price, feature-level willingness to pay, Nigeria-specific price sensitivity, organization renewal, support cost, and payment-failure rates. These must be observed before any exact price is presented as settled.

### Next Steps

Confirm the segment boundaries and provisional bands above, then proceed to interview and fake-door instrumentation. The immediate deliverable is not a launch price but a testable pricing hypothesis and a validation sequence.

---

**Research Completion Date:** 2026-09-30
**Research Period:** 2026-09-28 through 2026-09-30
**Source Verification:** Competitor prices carried with as-of dates; Submittable Discover free status live-confirmed; organization-plan prices flagged as needing a human pricing-page check.
**Market Confidence Level:** High on segment boundaries and pricing principles; low on exact prices, which remain hypotheses pending live conversion evidence.
