# Missa language infrastructure

Status: working draft

This document defines the meaning underneath Missa's product language. It is not a style guide
and it is not a list of homepage headlines. It is the shared model that keeps the product, UI,
marketing, and future AI features from saying different things about the same object.

## Product definition

Missa helps people find opportunities, prepare submissions, and track what happens next.

For organizations, Missa creates a clearer, faster, and more supportive submission pipeline —
from publishing an opportunity to reviewing work, making decisions, and helping people know what
happens next.

Missa has two products:

- **Passport** is for people sending work. It includes Opportunities, Tracker, alerts, fit and
  eligibility context, and calendar export.
- **Workspace** is for organizations running opportunities. It is the submission pipeline for
  forms, submissions, reviews, decisions, messages, delivery, and insights as those capabilities
  ship.

**Radar** is the internal intelligence layer. It discovers and checks opportunity information. It
is not a product label in the user interface.

## The product loop

```text
Opportunity → Work → Submission → Status → Outcome
     ↑                                       ↓
  source, deadline, fee,                 response, decision,
  eligibility, materials                 delivery or archive
```

### Opportunity

An opportunity is a call, grant, residency, fellowship, award, festival, journal, or similar
opening that someone can apply to or submit work to.

An opportunity has a source, organization, type, deadline, fee, eligibility, required materials,
submission link, and current status.

It is not a submission. It is the thing someone may choose to submit to.

### Work

Work is the thing a person sends: a poem, manuscript, film, image set, proposal, application, or
other creative or professional material.

It is not the file alone. A work may have one or more files and can appear in more than one
submission.

### Submission

A submission is a work or group of works sent to an opportunity.

It has a person, opportunity, submitted date, status, and history. One submission may contain
several works. Each work can receive its own outcome.

### Tracker item

A tracker item is a person's record of an opportunity and their progress with it.

The opportunity status belongs to the opportunity. **My status** belongs to the person's work:

`Saved → Preparing → Ready → Submitted → In Review → Outcome → Archived`

The product may show more detailed statuses inside those stages, but the user should always know
which stage they are in and what they can do next.

### Outcome

An outcome is what happened to a submission or work:

`Accepted · Declined · Waitlisted · Revision requested · Withdrawn · Delivered`

Declined is a state, not a judgement about the person or the work. The interface should state the
outcome plainly and avoid emotional language that pretends to know how the user feels.

## Opportunity states

These describe the opportunity itself, not the user's submission:

`Discovered · Needs verification · Opening soon · Open · Closing soon · Deadline extended · Closed · Archived · Uncertain`

Use **Needs verification** or **Uncertain** when the source does not support a confident claim.
Never turn missing information into certainty in copy.

## What Missa can say today

These are supported by the current product and intelligence layer:

- Find opportunities from monitored sources.
- Show deadlines, fees, eligibility, materials, and submission links when available.
- Keep the original source link with the opportunity.
- Show when an opportunity was checked and when its details changed.
- Explain fit with reasons, watch-outs, and disqualifiers.
- Save opportunities and move them through a personal tracker.
- Send deadline, change, opening, closing, and response-window alerts through the available alert
  surfaces.
- Export tracker dates to a calendar.
- Let organizations claim and correct listings.

## What Missa should not claim yet

These are planned or partial. They should not be presented as finished homepage capabilities:

- A complete Works and Files Library.
- Gmail Sync or Autopilot email tracking.
- Automatic submission updates from email.
- A full organization workspace for forms, review, decisions, and delivery.
- Payments, contracts, signatures, or award fulfilment.
- A public submitter Passport and privacy controls.
- AI review or AI-generated submissions.

## Shared vocabulary

| Use | Avoid | Why |
| --- | --- | --- |
| Opportunity | Open-call card, listing object | Names the thing the user is deciding about |
| Work | Submission item, asset | Keeps the person's work visible as a real object |
| Submission | Submission package, packet as the default | Names the act and record of sending |
| Tracker | Pipeline system, opportunity OS | Describes the user's actual job |
| My status | Workflow state, lifecycle state | Separates the user's progress from the opportunity's status |
| Source | Evidence layer, ingestion source | Tells the user where the information came from |
| Checked | Verified, certified, guaranteed | Does not overstate what Missa knows |
| Workspace | Organization operating system | Says where the organization works without inflated positioning |
| Find, save, prepare, send, track | Activate, orchestrate, operationalize | Uses the user's verbs |

Use **open call** in marketing when it is the natural term for the audience. Use **Opportunity**
in navigation and product UI.

## Language rules

1. Start with meaning, not a headline. Name the object, state, audience, and next action first.
2. One idea per sentence. Prefer short, concrete sentences.
3. Use active voice. Say who does what.
4. Use the user's verbs: find, save, prepare, send, track, review, decide, deliver.
5. Do not make a fluent sentence carry an unsupported product claim.
6. Keep uncertainty visible. Say when information is missing, inferred, changed, or needs checking.
7. Every action label should describe the result: **Save opportunity**, **Open tracker**, **Send a
   submission**, **Review submissions**.
8. Every status message should answer: what happened, what it means, and what happens next.
9. Do not use mood as product meaning. Words such as *momentum*, *calm*, *thread*, and *where it
   belongs* can appear only when they add meaning; they cannot substitute for a capability.
10. The landing page can have personality. The app should use standard nouns. Both must refer to
    the same underlying objects and states.

## Homepage boundary

The homepage only needs to answer four questions:

1. What is Missa? A place to find opportunities and track submissions.
2. Who is it for? People who send work.
3. What can I do now? Find an opportunity, save it, and keep track of the next step.
4. What is the organization path? Organizations can create a clearer, faster, more supportive
   submission pipeline. Workspace capabilities are being built.

The homepage should therefore contain:

- one direct hero;
- one three-step explanation: Find → Prepare → Track;
- one real product proof area using opportunity and tracker language;
- one restrained organization link;
- one clear sign-up action.

It does not need a promise bar, a cinematic narrative, a simulated acceptance story, or a long list
of capabilities that are not shipped.

## Example message model

Every important message should be representable as:

```text
object: opportunity | work | submission | tracker_item
state: current product state
audience: person | organization | reviewer
meaning: what happened
action: what the user can do now
certainty: confirmed | inferred | unknown
source: where the information came from
```

Example:

```text
object: opportunity
state: deadline-extended
audience: person
meaning: Northbank Residency moved its deadline to 30 September.
action: Review your saved submission.
certainty: confirmed
source: Northbank Residency's original call page
```

This is the standard the homepage should meet too: say what Missa knows, who it helps, and what the
person can do next.
