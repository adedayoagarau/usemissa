---
title: Missa Value and Positioning
version: "0.2"
status: working draft
last_updated: "2026-10-02"
owners: Founder, Product, Brand, Editorial
scope: Internal positioning, fundraising, product strategy, and public-copy hierarchy
---

# Missa value and positioning

> Public messaging and microcopy now live in
> [`missa-messaging.md`](./missa-messaging.md). This document keeps the
> strategy, business model and investor narrative. Its "Messaging hierarchy"
> section is superseded.

This document explains what Missa is worth to the creators and organizations who use and pay for it, and to the investors who may fund it. It is the narrative layer between the current product description and the longer-term product strategy.

## The core thesis

Missa is building the trusted opportunity layer for creative work.

It turns scattered, changing open calls into understandable and actionable decisions. A person should be able to find an opportunity, inspect the source and its limits, decide whether it is worth their time, prepare the right work, submit when supported, and keep the record afterward.

Missa is not only a directory. It is not only an application form. Its value comes from connecting discovery to action and outcome while keeping the underlying facts visible.

The public promise can stay concrete:

> Find the call worth your time.

The strategic promise is broader:

> Make opportunity easier to find, understand, pursue, and remember.

## The problem

Opportunity is abundant, but access to it is fragmented.

- Open calls live across organization websites, application systems, newsletters, social posts, and search results.
- Important facts are expressed inconsistently: eligibility, geography, fees, materials, deadlines, rights, and response expectations are difficult to compare.
- A person can spend more time searching and reconstructing requirements than making a good decision about the work itself.
- After someone saves or submits, the opportunity often disappears into a separate spreadsheet, inbox, calendar, or portal.
- Organizations need relevant submissions, but publishing a clear call and managing the resulting review and decision process are separate jobs in many systems.

The problem is not a lack of listings. It is the lack of a trusted path from possibility to action.

## The product wedge

Missa starts with creative opportunities: grants, magazines, residencies, fellowships, commissions, contests, awards, and other open calls.

The first product job is source-first discovery. Missa keeps the official source close, separates known facts from unknown or conflicting details, and gives people a private place to save the decision and what comes next.

The wedge is deliberately useful before Missa has supply-side dominance. A person should be able to track an opportunity they found through Missa, an opportunity Missa found elsewhere, or an opportunity they add themselves.

## The platform direction

The larger product connects two related paths:

### For creators

Missa helps a person:

1. find relevant opportunities;
2. compare the facts that determine whether one is worth pursuing;
3. save the opportunity and the next action;
4. prepare from a private Profile and Library;
5. submit through Missa where the opportunity supports it;
6. retain receipts, decisions, deadlines, and outcome history.

### For organizations

Missa helps an organization:

1. publish a clear opportunity;
2. receive the right material in a defined format;
3. route and review submissions with appropriate permissions;
4. record decisions per Work;
5. communicate the result;
6. complete the post-decision delivery or reporting work.

These are connected by the Opportunity, but they are not the same surface or the same permission model.

## Who receives value

| Person or customer | Value created | Evidence we need |
| --- | --- | --- |
| Creator | Less search time, clearer fit decisions, fewer missed deadlines, and reusable submission work | Relevant saves, return usage, save-to-action conversion, completed submissions, paid conversion, and retention |
| Organization | Clearer public calls, more relevant and better-prepared submissions, and less fragmented review and decision work | Paid pilots, publishing activity, submission quality, workflow adoption, and renewal |
| Missa | A structured record of opportunities, requirements, source evidence, creator activity, and outcomes | Source accuracy, freshness, coverage, repeat usage, and permission-safe aggregate insight |
| Investor | A path from a painful fragmented workflow to a large, repeatable category | Creator subscription revenue, organization revenue, retention, distribution, and a defensible data or network advantage |

## Why this can become a large company

This is a venture-scale hypothesis, not a claim that has already been proven.

1. **The category is broader than one vertical.** The same discovery and submission problems appear in creative work, grants, fellowships, residencies, awards, accelerators, scholarships, and other open-call markets.
2. **The workflow repeats.** People pursue many opportunities over time, and organizations run recurring programs. A useful record becomes more valuable with each cycle.
3. **The product can connect both sides.** Creators need discovery and preparation. Organizations need distribution, intake, review, decisions, and delivery.
4. **Structured evidence can compound.** A source-aware opportunity graph, creator preferences, deadlines, requirements, and permission-safe outcome data can produce better discovery than a static list.
5. **Distribution can be built into the product.** Public opportunity pages, organization pages, guides, sharing, and embeds can bring demand to the system before every organization uses Missa’s submission workflow.

The moat is not “we use AI.” The durable value is the structured, source-linked, permission-safe system around opportunities and action.

AI is not part of Missa's creator-facing product or messaging. Creative communities widely distrust it, and leading with it would cost Missa the trust the product depends on. Missa does not generate or rewrite creators' materials, does not present AI as a feature or benefit, and does not use creator work to train models. Any internal automation, such as extracting opportunity details from official sources, stays behind source-linked records that can be checked against the official source, and is never marketed.

## Messaging hierarchy

Use different language for different jobs. Do not make one sentence serve every audience.

| Job | Message |
| --- | --- |
| Public acquisition | Find the call worth your time. |
| Creator value | Compare the facts, open the official source, save your decision, and keep track of what comes next. |
| Organization value | Publish the opportunity, receive the work, review it, record decisions, and complete the next step. |
| Strategic category | The trusted opportunity layer for creative work. |
| Investor narrative | Missa is building the discovery and submission infrastructure for a fragmented opportunity economy. |

“Revolutionize opportunities” describes the ambition, not the proof. Prefer the concrete change Missa creates: it makes scattered opportunity understandable, actionable, and durable.

## Business model direction

Missa charges creators. A creator-free model cannot sustain the product: SMS and WhatsApp delivery, source monitoring, and catalogue maintenance all carry per-user cost, and organization revenue alone arrives too slowly to fund them.

The model is freemium. The free tier stays genuinely useful because it brings people in, earns search traffic, and gives organizations a reason to be on Missa. Paid tiers charge for the work between saving a call and getting a result, and for anything with a per-use cost.

### What stays free

- Discovery, Opportunity pages, official-source links, and verification detail. Trust and facts are never paywalled.
- Saving and tracking up to 10 calls in progress at once (not yet submitted, deadline still ahead). Submitted, decided and closed calls never count, so the limit never penalises applying. Enforced by `creatorEntitlements.ts`; plans live in `creator_plans` (migration 0080).
- A basic calendar and email reminders. A free user never misses a deadline because they did not pay; at least one email reminder is always sent.

### What creators pay for

| Tier | For | Includes (direction, not shipped) |
| --- | --- | --- |
| Plus | Creators who submit regularly | Unlimited tracking; SMS and WhatsApp reminders within a monthly allowance; reply-to-act messages; start-by dates; opening, deadline-change, and deadline-day alerts; pre-submit checks including blind-review name checks; the simultaneous-submission guard; the rights ledger; the money ledger with export; the automatic creative CV |
| Pro | Heavy submitters and grant applicants | Everything in Plus, booked preparation time, capacity planning, an annual plan, withdrawal and follow-up templates the creator edits and sends, referee reminders, and multiple pen names or portfolios |
| Add-ons | Anyone | Extra message packs and paid application reviews by past winners, jurors, or editors, with Missa taking a share |

Working price hypotheses to test, not decisions: Plus at about US$7 a month or US$60 a year, and Pro at about US$18 a month or US$150 a year. Comparable creator subscriptions exist in the market, but competitor prices must be checked before they are cited.

### Pricing principles

- Price regionally by purchasing power and charge in local currency where possible. Nigeria is priced in naira through a local processor, with WhatsApp as the default message channel because international SMS is expensive and less reliable.
- Offer upgrades when the user can see the value: reaching the tracking limit, approaching a deadline, saving a recurring call, an acceptance with other submissions still pending, or a first blind-review call. A 14-day Plus trial begins on the first save of a call closing within 30 days.
- Upgrade prompts follow the product's calm register. They state what the person gets, never what they will lose, and never use alarm treatment.
- Validate willingness to pay with a founding-member annual presale and price tests before building full billing.

### Organization and institution revenue

Creator subscriptions fund the product now. Organization and institution revenue remains the larger long-term line and must come from a clear operational outcome:

- Organizations pay for reaching eligible, well-matched creators, eligibility screening at intake, review tools, funder and impact reporting, payments and contracts, and an "Apply with Missa" intake path that receives better-prepared submissions.
- Foundations and sponsors can fund fee waivers for under-represented or low-income applicants across many calls.
- Institutions such as MFA programmes, arts councils, writer centres, and residencies buy Plus for a cohort or membership and receive permission-safe aggregate activity. Creators get the product without paying, the institution pays, and Missa gains distribution.

Do not sell organizations an abstract "network." Sell a defined job with a measurable result.

## What we must prove before making larger claims

- A new creator can find and save a genuinely relevant opportunity quickly.
- Saved opportunities turn into preparation or submission activity.
- Creators return because Missa remains useful after the first search.
- Creators will pay for Plus at a sustainable price, and paid creators retain across at least one full submission season.
- Paid features save time or prevent mistakes that creators can name, such as a missed deadline, a disqualified blind submission, or a missed withdrawal.
- Organizations will publish or pay for a specific workflow, not only create a profile.
- Source records remain accurate enough that people trust Missa with consequential deadlines and requirements.
- The product can expand categories without weakening taxonomy, provenance, privacy, or user understanding.

These should become the evidence plan for fundraising. They are more useful than a feature-count roadmap.

## Current product truth and future direction

The strategy must keep present capability separate from intended capability.

| Layer | Current description | How to speak about it |
| --- | --- | --- |
| Public discovery | Source-first Opportunity browsing, official-source links, and visible uncertainty | “Missa helps you compare the facts and check the official source.” |
| Creator workspace | Profile, Tracker, Library, and submission-related surfaces exist in the product model and current route work at different maturity levels | Name the specific available surface; do not imply every lifecycle feature is complete. |
| Organization product | Organization publishing, intake, review, decisions, messages, delivery, and insights are the intended operating model, with some routes and contracts still bounded or local | Present the workflow as the product direction or a pilot capability unless current production evidence supports the claim. |
| Paid tiers and SMS | Business direction. Creator billing and SMS delivery are not shipped; SMS has schema groundwork only | Describe as direction. Do not publish prices, tiers, or SMS features until they are live. |
| Opportunity graph | Structured, source-aware discovery and future aggregate intelligence | Describe this as the long-term advantage we are building, not as data we already possess at full scale. |

A strategy statement is not evidence of a shipped feature. Public copy, investor materials, and customer commitments must be checked against the current route, data, and deployment state.

## Founder and investor narrative

Missa is building the trusted opportunity layer for creative work. Today, opportunities are scattered across the internet and difficult to compare: deadlines, fees, eligibility, requirements, and source details do not arrive in one understandable path. Missa starts by helping creators find the call worth their time, inspect the official source, save the decision, and keep track of what comes next. Over time, it connects discovery to preparation, submission, review, decisions, and outcomes for both creators and organizations. Creators get a useful free tier and pay when Missa saves them time and prevents costly mistakes between saving a call and getting a result; organizations and institutions pay when Missa helps them reach the right people and run the work that follows.

## Editorial and product rules

- Lead public copy with the action or decision, not the technology.
- Use “trusted” as a standard we must meet, not as proof we have already earned everywhere.
- Keep source, limits, unknowns, fees, eligibility, geography, deadlines, and outcomes distinct.
- Do not claim eligibility, quality, acceptance likelihood, fairness, or completeness without evidence.
- Never send, pay, or accept a declaration on a creator's behalf without their explicit approval of that specific submission.
- Do not lead with AI or describe Missa as AI-powered in public, creator, or organization copy.
- Do not call a planned organization workflow shipped merely because a route or visual direction exists.
- Keep customer-facing language plain. “Opportunity layer” belongs in strategy and fundraising; a creator should usually see “Opportunities,” “Tracker,” “Library,” and a direct next step.

## Later: keeping work in circulation

This direction is deliberately deferred. It asks creators to trust Missa with their finished work, and that trust has to be earned first.

The idea reverses the usual starting point. Instead of finding a call and then deciding what to send, the creator adds finished work and Missa suggests where each piece could go next. Missa then prepares the submission package for the creator to review and send, follows the response, and suggests the next good match after a decline. The creator-facing measure would be pieces in circulation.

Conditions before revisiting it:

- Creators already rely on Missa's opportunity records and deadlines, and the records have a visible accuracy track record.
- Paid creators retain across at least one full submission season.
- Creators ask for help placing their work, rather than Missa proposing to take it.
- The terms for storing and handling creator work are clear, minimal, and reviewed. Missa never trains models on creator work.

The guardrails stay fixed whenever it returns: nothing is sent without the creator's explicit approval of each submission, fit matters more than volume so organizations do not receive spam, creative work is never generated or altered, and each destination's rules are followed.

## Open decisions for the next revision

1. Which creator segment is the first paying wedge?
2. What are the final free-tier limits and Plus and Pro prices after the presale and price tests?
3. Which three metrics will prove that discovery becomes action?
4. Which organization type is the first paid wedge, and which outcome justifies payment first: distribution, intake, review, or delivery?
5. Which institutions are the first Missa for Programs pilots?
6. Which parts of the Opportunity graph can be built from consented, source-linked data without compromising privacy or editorial trust?
