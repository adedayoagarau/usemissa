---
title: Missa Content Style Guide
version: "2.0"
status: canonical
last_updated: "2026-08-07"
owners: Brand, Product, Editorial
applies_to: Marketing, product, opportunity records, organizations, editorial, support, lifecycle messaging, and AI-assisted copy
---

# Missa content style guide

> Say what people need to know. Then stop.

This is the rule behind every word Missa publishes.

Missa does not perform warmth. It does not turn routine actions into journeys, milestones, or moments of possibility. The care should be visible in the product: useful matches, accurate details, clear decisions, and respect for people's time.

## 1. What this guide is for

Use this guide for:

- marketing pages;
- product interfaces;
- opportunity records and recommendations;
- onboarding;
- emails and notifications;
- help and support;
- community posts and editorial;
- organization and reviewer workflows;
- AI-assisted copy.

Use the naming document for product names, the design system for layout, and the [color direction](/docs/missa-color-direction.md) for palette decisions. Official sources, legal requirements, accessibility, and safety always outrank voice.

When two rules conflict, choose the wording that is more accurate and easier to act on.

## 2. What Missa does

### For artists

Missa helps artists find opportunities that fit their work and keep track of what they submit.

### For organizations

Missa helps organizations publish opportunities, receive work, run reviews, and send decisions.

### The marketing promise

> Find your next opportunity.

Supporting copy may explain the range:

> Discover grants, residencies, fellowships, commissions, and open calls that fit your work.

Do not turn this into a mission statement. Do not mention the technology before the benefit.

## 3. Product naming

Missa uses ordinary nouns for user-facing products and tasks. Name what a person can find, do, or understand—not the system that powers it.

### Use

| Use this | For | Do not use in user-facing copy |
| :-- | :-- | :-- |
| **Profile** | Public identity and selected Works, with private information managed separately | Passport, Radar, Workspace |
| **Opportunities** | Public opportunity discovery and listings | Discover, Radar |
| **Tracker** | Submission history, deadlines, and outcomes | Pipeline View, intelligence features |
| **Library** | Works, files, and saved answers | Wallet |
| **Organization** | The organization-facing product area | Workspace |
| **Official source** / **Guidelines** | Source access and provenance | Radar, Trust Layer, freshness score |
| **Progress** or no label | Earned progress moments, if retained | Props |

The product should read as:

> Missa → Opportunities · Tracker · Library · Profile

> Missa → Opportunities · Submissions · Reviews · Decisions · Messages · Delivery · Insights · Settings

Internal package names, route groups, database tables, migration names, and worker identifiers may retain historical names for compatibility. They must not leak into rendered copy, API errors intended for people, page titles, email subjects, or exported labels.

Do not create a feature name when a clear noun already describes the task. “Missa checks the source” is better than naming an opportunity engine.

### How Missa uses AI

AI is part of the product, not the headline.

- Marketing should lead with what people can find or do.
- Recommendations should explain what information shaped them.
- Generated summaries should remain tied to their sources.
- AI must not judge artistic quality or predict acceptance.
- People must be able to correct their profile, dismiss a recommendation, and check the official source.

## 3. Reference brands

Missa learns from Submittable and Chill Subs. It does not copy either one.

| Reference | What to learn | What not to carry over |
| :-- | :-- | :-- |
| Submittable | State the product value plainly. Use literal headings, familiar nouns, direct actions, and step-by-step help. | Generic enterprise language, inflated efficiency claims, and long marketing explanations. |
| Chill Subs | Know the submission world. Use the terms writers and artists already use. Allow personality to appear without polishing every sentence. | Writer-only assumptions, forced irreverence, profanity as a voice system, or its public “No AI” position. |
| Missa | Make relevance inspectable. Keep deadlines, fees, requirements, sources, and uncertainty visible. | Turning evidence into bureaucratic copy or explaining the matching system in every message. |

The distinction is simple:

- Submittable is useful for directness.
- Chill Subs is useful for familiarity.
- Missa must earn trust through relevance and evidence.

Reference sources are listed at the end of this guide.

## 4. Missa's voice

Missa is **plain, specific, and familiar**.

### Plain

Use the shortest ordinary sentence that carries the meaning.

**Write**

> We’ll send you an invite when Missa is ready.

**Not**

> No password yet. Just a note when Missa is ready for you.

### Specific

Name the thing, state, date, amount, requirement, or action.

**Write**

> This residency closes on 18 September.

**Not**

> The deadline is coming up soon.

### Familiar

Use language people in the field already use. Do not make the product sound like a policy document.

**Write**

> Add a writing sample.

**Not**

> Upload the required creative-work asset.

Familiar does not mean chatty. Plain product copy is allowed to sound ordinary.

## 5. Hard rules

These rules are pass or fail.

### 5.1 Give each message one job

A message may:

- explain what something is;
- state what happened;
- ask for an action;
- explain a consequence;
- give a reason;
- help someone recover.

Do not make one small message perform all six jobs.

### 5.2 Put the answer or state first

**Write**

> Your profile was saved.

> This call is limited to artists based in Ghana.

> We could not upload the file.

Do not begin with empathy, scene-setting, a brand belief, or an explanation of what Missa tried to do.

### 5.3 Make every extra sentence earn its place

After the first sentence, add another only when it gives one of these:

- a fact needed to decide;
- the consequence of the current state;
- the reason for a request;
- the next required action;
- a recovery step;
- source or uncertainty information.

Tone is not a reason to add a sentence.

### 5.4 Do not perform care

Do not tell people that Missa understands how hard, exciting, vulnerable, or meaningful their work is. Show care by being accurate and useful.

**Write**

> The organization has not shared a decision date.

**Not**

> We know waiting can be hard. Your work matters, and we’ll be here while you wait.

### 5.5 Do not infer feelings

Never assume someone is excited, disappointed, proud, nervous, relieved, or ready.

Celebrate only when the event is confirmed, and name the event rather than the emotion.

**Write**

> Accepted. The residency begins on 4 May.

**Not**

> Amazing news! You must be thrilled.

### 5.6 Do not narrate the interface

Labels, headings, and nearby controls already provide context.

**Write**

Label: **Email address**

Helper text: **We’ll send your invitation here.**

**Not**

> Enter your email address in the field above to join the waitlist.

### 5.7 Do not repeat the headline

Supporting copy must add information.

**Headline**

> Find your next opportunity.

**Support**

> Discover grants, residencies, fellowships, commissions, and open calls that fit your work.

The second line adds scope. It does not restate “find opportunities.”

### 5.8 Prefer the object to the abstraction

Use **deadline**, not **time-sensitive consideration**. Use **review**, not **evaluation workflow**. Use **work**, not **creative output**.

### 5.9 Describe the product, not the aspiration

**Write**

> Save opportunities and track your submissions.

**Not**

> Move your work forward with confidence.

### 5.10 Stop when the task is complete

If a button says **Join the waitlist**, the line below only needs to explain what happens next:

> We’ll send you an invite when Missa is ready.

Do not add a promise about spam, passwords, creativity, community, or the future unless it answers a real question.

## 6. Sentence and component limits

Limits make the guide enforceable. Break them only when accuracy, safety, law, or accessibility requires more.

| Component | Default limit | Rule |
| :-- | :-- | :-- |
| Page headline | 2–8 words | One promise or task. |
| Section heading | 2–7 words | Name the subject. |
| Supporting line | 1 sentence, up to 24 words | Add scope, proof, or a distinction. |
| Button | 1–3 words | Verb + object when possible. |
| Field label | 1–4 words | Name the information. |
| Helper text | 1 sentence, up to 18 words | Explain why, format, or consequence. |
| Toast | Up to 8 words | State the completed action. |
| Empty state | 1–2 sentences | State what is absent and how to add it. |
| Error | 1–3 sentences | State failure, preserved state, and recovery. |
| Transactional email opening | 1 sentence | State the event or current status. |

Short is not the same as abrupt. Exact words usually feel more respectful than padded ones.

## 7. Constructions Missa does not use

Reject these patterns in product and marketing copy.

### False contrast

> No clutter. Just the opportunities that matter.

> Not another platform. A home for your field.

### Balanced slogan pairs

> Your work is specific. Your opportunities should be too.

> Less searching. More creating.

### Journey language

> From first idea to final decision.

> Every step of your submission journey.

### Universal openings

> Whether you’re a poet, filmmaker, artist, or dreamer…

> In today’s fast-moving creative landscape…

> At Missa, we believe…

### Product theatre

> A calmer way to begin.

> One clear place for the work ahead.

> Where opportunity meets possibility.

### Soft commands

> Simply add your work.

> Just choose a file.

If the action is easy, the interface will show it.

### Feature-to-lifestyle endings

> …so you can focus on what matters most.

> …so you can spend more time creating.

Name the actual result instead.

### Rhetorical triplets

Do not stack three abstract benefits for rhythm:

> Clearer, calmer, more connected.

Lists of three are fine when they enumerate real items:

> Add the title, year, and medium.

## 8. Words to remove on sight

Remove these unless the specific context proves they are necessary:

- empowering;
- seamless;
- frictionless;
- meaningful;
- thoughtful;
- transformative;
- intuitive;
- robust;
- powerful;
- effortless;
- exciting;
- inspiring;
- holistic;
- journey;
- ecosystem;
- unlock;
- elevate;
- supercharge;
- streamline;
- reimagine;
- revolutionize;
- navigate;
- leverage;
- tailored, when **based on your profile** is clearer;
- personalized, when the inputs are not explained;
- calm or calmer, when describing the product;
- human or humane, when the behavior can be named;
- just or simply, when minimizing an action;
- ready for you;
- built for you;
- designed to help;
- all in one place;
- what matters most.

Also remove **successfully** when the verb already states success.

> Changes saved.

not

> Your changes were successfully saved.

## 9. Marketing

Marketing may have rhythm. It may not become vague.

### 9.1 Homepage hero

Use this structure:

1. One direct headline.
2. One sentence naming the opportunity types and the fit.
3. One primary action.
4. Optional operational detail.

Canonical waitlist hero:

> # Find your next opportunity.
>
> Discover grants, residencies, fellowships, commissions, and open calls that fit your work.
>
> **Join the waitlist**
>
> We’ll send you an invite when Missa is ready.

Do not add an eyebrow unless it supplies information, such as **For organizations** or **Now open in Nigeria**.

### 9.2 Product pages

Lead with the thing the page enables.

**For artists**

> Find opportunities that fit your work.

> Use your field, location, and preferences to narrow the list. See why each opportunity appears.

**For organizations**

> Run your open call in Missa.

> Publish the requirements, receive applications, assign reviews, and send decisions.

### 9.3 Claims

Use numbers only with a source, scope, and date.

**Write**

> 423 open opportunities as of 7 August 2026.

**Not**

> Thousands of life-changing opportunities.

Do not call a recommendation **best**, **perfect**, or **made for you**. Missa can identify compatibility, not quality or outcome.

### 9.4 Calls to action

Use the action people are about to take:

- Browse opportunities
- Join the waitlist
- Build your profile
- Save opportunity
- Track submission
- Read the guidelines
- Publish opportunity
- Assign reviewers
- View decision

Avoid **Learn more** when the destination has a clearer name.

## 10. Product interface copy

Product copy should disappear into the task.

### 10.1 Navigation

Use stable nouns:

- Opportunities
- Saved
- Submissions
- Work
- Calendar
- Messages
- Profile

Use product names only when they help orientation. Do not make people learn internal system names to complete ordinary work.

### 10.2 Buttons

Use a specific verb and object:

- Save profile
- Add work
- Upload file
- Submit application
- Assign reviewers
- Send decisions
- Delete submission

Use **Continue** only when the next action varies or the person is moving through a sequence without committing a change.

### 10.3 Helper text

Helper text answers one useful question:

- Why is this needed?
- What format is accepted?
- Who will see it?
- What happens after this?

**Write**

> Add your location to exclude opportunities you cannot enter.

> PDF, DOCX, or TXT. Maximum 25 MB.

> Reviewers will see this answer.

Do not describe the field label.

### 10.4 Empty states

State what is missing. Offer one action.

> **No saved opportunities**
>
> Save an opportunity to find it here.
>
> **Browse opportunities**

> **No submissions yet**
>
> Track a submission you have already sent.
>
> **Add submission**

Avoid metaphors, encouragement, and jokes unless the surface is low stakes and the joke improves recognition.

### 10.5 Loading

Name the action in progress:

- Searching opportunities…
- Checking the source…
- Saving changes…
- Uploading file…
- Sending decisions…

Do not announce success before completion.

### 10.6 Success

State what completed:

- Profile saved.
- Opportunity saved.
- Work added.
- Submission tracked.
- Review submitted.
- Decision sent.

Add a second sentence only when the result changes what is available next.

> Submission sent. Your receipt is available in Submissions.

### 10.7 Errors

Use this order:

1. What failed.
2. What remains safe, if this is not obvious.
3. What to do next.

> We could not save your profile. Your previous version is still available. Try again.

> This file is larger than 25 MB. Choose a smaller file.

> Payment failed. You were not charged. Try another payment method.

Never use **Oops**, a joke, or an apology without recovery information.

### 10.8 Validation

Say what is needed:

- Enter an email address.
- Add a title.
- Choose a deadline after the opening date.
- Upload a PDF, DOCX, or TXT file.

Do not use **Invalid input** when a specific instruction is available.

### 10.9 Confirmation dialogs

Name the action and consequence. Repeat the action on the final button.

> **Delete this work?**
>
> It will be removed from Work. Submitted applications will keep their archived copy.
>
> **Cancel** · **Delete work**

## 11. Opportunities, matching, and evidence

This is where Missa must sound like itself.

### 11.1 Opportunity summaries

Lead with the useful facts:

1. opportunity type;
2. who can apply;
3. what is offered;
4. deadline;
5. fee;
6. required materials;
7. official source.

Do not write a promotional introduction unless it comes from the organization and is labelled accordingly.

### 11.2 Fit explanations

Explain fit with observable information.

> This may fit because the residency accepts installation work and is open to artists based in West Africa.

Better in a compact interface:

> **Why this fits**
>
> Installation art · Open to West Africa · No application fee

Do not infer artistic quality, identity, financial need, career potential, or likelihood of acceptance.

Do not use a percentage unless the percentage has a defined, tested meaning that people can inspect.

### 11.3 Profile-based recommendations

Name the inputs when useful:

> Based on your profile: poetry, Nigeria, and no-fee opportunities.

Provide controls:

- Why this fits
- Show fewer like this
- Not relevant
- Update profile

### 11.4 Sources

The official organization or program page is the authority. Keep it close to consequential details.

Use:

- Open official source
- Read official guidelines

Do not say **verified** unless the documented verification standard has been met.

### 11.5 Unknown information

Unknown is not negative. It is unfinished information.

Use the most exact state:

- Fee not stated
- Fee not confirmed
- Deadline not confirmed
- Location requirement not stated
- Required materials not confirmed
- Organization not confirmed
- Decision date not provided

Use **Fee not stated** when the checked source does not mention a fee. Use **Fee not confirmed** when the source or extraction has not been checked well enough to make that claim.

Do not convert missing information into **No fee**, **Open-ended**, **All artists**, or **No restrictions**.

### 11.6 Source access

Keep the official source close to the opportunity:

- Open official source
- Read official guidelines
- Visit organization website

Missa tracks source freshness and refresh state in backend operations. Do not expose check times, freshness scores, refresh prompts, or source-age badges in customer-facing opportunity cards and pages.

### 11.7 Conflicts

Do not silently choose between conflicting sources.

> The program page lists 12 October. The application form lists 10 October. Check with the organization before applying.

## 12. Status, emails, and difficult moments

### 12.1 Status labels

Use the state supplied by the organization or system:

- Draft
- Submitted
- Received
- In review
- Shortlisted
- Accepted
- Declined
- Waitlisted
- Withdrawn

Do not soften **Declined** into **Not this time** or **Your journey continues**.

### 12.2 Transactional emails

Use this order:

1. subject naming the event;
2. first sentence stating what happened;
3. essential date, amount, requirement, or consequence;
4. one action.

**Submission received**

> **Subject:** Submission received: {{opportunity_title}}
>
> {{organization_name}} received your submission on {{date}}. Your submitted files and current status are in Missa.
>
> **View submission**

**Deadline reminder**

> **Subject:** {{opportunity_title}} closes tomorrow
>
> The deadline is {{deadline}} {{timezone}}. Your writing sample is still missing.
>
> **Continue application**

### 12.3 Declines

State the decision. Preserve access to the record. Do not offer generic consolation.

> {{organization_name}} declined this submission. The decision message and submitted files remain available in Missa.

Do not write:

- Better luck next time.
- Keep going.
- Their loss.
- Everything happens for a reason.
- Your work still matters.

### 12.4 Waitlists and delays

State whether action is required and whether a date is known.

> You are on the waitlist. The organization expects to share an update by 30 September. No action is required.

### 12.5 Ineligibility

Name the rule, not a judgment.

> This grant is limited to residents of Canada. Your profile lists Nigeria.

If Missa does not have enough information:

> This grant is limited to residents of Canada. Add your current location to check this requirement.

### 12.6 Missed deadlines

> This call closed on 7 August at 5:00 PM ET. The organization is no longer accepting applications.

Do not mention procrastination, readiness, or trying again.

## 13. Organizations and reviewers

Organization copy should name the operation and its effect. It does not need enterprise language.

### 13.1 Organization marketing

**Write**

> Publish your call, receive applications, assign reviewers, and send decisions.

**Not**

> Run a thoughtful program without turning the work behind it into a maze.

### 13.2 Workflow language

Distinguish these states:

- Requested
- Queued
- Sent
- Delivered
- Opened
- Confirmed
- Failed

Do not use **Sent** when a message is only queued. Do not use **Delivered** without delivery evidence.

### 13.3 Reviewer instructions

State the criterion and visibility:

> Score the application against the published criteria. Program administrators can see your score and note.

> Declare a conflict before opening the application.

Do not prime reviewers with popularity, predicted quality, or AI-generated judgments.

### 13.4 Claims about fairness and security

Name the mechanism and scope.

**Write**

> Hide applicant names during the first review round.

**Not**

> Remove bias from review.

## 14. Community and editorial

This is where Missa may sound looser. The facts still come first.

### 14.1 Community voice

Community copy may use:

- contractions;
- fragments;
- one small joke;
- field-specific language;
- a clear opinion;
- direct acknowledgment of ordinary submission habits.

It should not use:

- forced slang;
- motivational language;
- jokes about rejection, fees, access, or unpaid work;
- a “fellow kids” tone;
- personality that delays the useful information.

**Write**

> You got published. Add it to your profile before you forget.

> Twelve no-fee poetry calls close this month. We checked the deadlines and locations.

**Not**

> Your words found a home! Take a moment to celebrate this beautiful milestone in your creative journey.

### 14.2 Humour

Humour is optional. Never instruct an AI to “add a playful line.”

Keep a joke only when:

- it sounds natural in context;
- the useful information remains clear;
- it is not aimed at a person or group;
- removing it would not expose missing information.

### 14.3 Editorial

Lead with the answer. Then explain the evidence, differences, and next step.

A guide should include:

1. the question or subject;
2. a direct answer;
3. the details that change the answer;
4. examples or sources;
5. the reviewed date.

Do not pad articles with an opening scene, a universal claim about creativity, or a summary that repeats the introduction.

### 14.4 Search pages

Use the words people search for, then provide distinct information.

> **Poetry opportunities**
>
> Browse open magazine calls, contests, grants, and residencies for poets.

Do not publish pages whose only difference is a swapped keyword.

## 15. AI and automation copy

### 15.1 Marketing

Do not lead with **AI-powered**, **intelligent**, **smart**, or **automated**.

Lead with the result:

> See opportunities that match your field, location, and preferences.

### 15.2 Product disclosure

Explain AI when it changes, ranks, summarizes, drafts, or acts on information in a way the person needs to understand.

Use this order:

1. what Missa did;
2. what information it used;
3. what remains uncertain;
4. what the person can do.

> Missa summarized these requirements from the official guidelines checked on 7 August. Read the source before applying.

> This recommendation uses your field, location, and fee preferences. Update your profile or hide this opportunity.

### 15.3 Allowed verbs

Use:

- matched;
- suggested;
- summarized;
- extracted;
- grouped;
- drafted;
- flagged;
- checked.

Avoid:

- knows;
- understands you;
- chose for you;
- judged;
- guaranteed;
- eliminated bias;
- found the perfect match.

### 15.4 Human control

People must review consequential drafts and decisions. Preserve the original source. Make important changes reversible and traceable.

AI may help organize or summarize an application. It must not score artistic worth or make an acceptance decision.

## 16. Terminology

Use ordinary nouns consistently. Do not expose Missa's taxonomy architecture as a product concept.

| Use | Meaning | Avoid |
| :-- | :-- | :-- |
| Opportunity | Umbrella term for grants, residencies, fellowships, commissions, awards, and open calls | listing object, opportunity item |
| Work | A poem, manuscript, image, film, project, proposal, or other creative work | asset, content item |
| Works | A collection of the person's public or private Works | practice, portfolio inventory |
| About | The person's own short introduction on a public Profile | creator context layer |
| Selected Works | Works chosen for the public Profile | featured assets |
| Publications | Published Works and the publication details the person chooses to show | credits database |
| Links | Websites and other destinations the person chooses to share | web references |
| Open call | A public invitation to submit or apply | use as the name for every opportunity |
| Submission | Work and information sent for one opportunity | submission package |
| Application | Use when the organization asks people to apply | submission when the source says application |
| Profile | The public page a person chooses to share, plus the private information used by Missa separately | Passport, Radar, Workspace |
| Preferences | Private choices that shape recommendations | practice preferences, matching inputs |
| Settings | Controls for preferences, notifications, integrations, privacy, security, and account data | control plane |
| Source | The official page or document supporting a record | evidence artifact |
| Organization | The group running an opportunity | enterprise, entity |
| Reviewer | The person assessing an application | evaluator, judge unless the program uses it |

### 16.1 Sunset taxonomy language

Do not use these words as customer-facing labels, headings, explanations, filters, or onboarding questions:

- **practice**, **practice family**, **creative practice**, and **practice taxonomy**;
- **field** when it means the kind of work a person makes or an Opportunity accepts;
- **creative field** and **creator context layer**;
- **facet**, **taxonomy**, **term ID**, **matching input**, or other implementation language.

When a classification is needed, use the specific term in context: **poetry**, **film**, **photography**, **fiction**, **sound**, **editor**, or another approved value. If the product is asking for the person's own description, ask **What do you make?** Do not add a new umbrella label until the taxonomy and IA have an approved name.

The word **field** remains allowed for ordinary form language, such as **email field**, **required field**, and **field error**. It is not allowed as the public taxonomy label.

Taxonomy values, stable IDs, facet keys, and legacy names may remain in code, schema, migrations, and internal documentation when required for compatibility. They must not render in customer-facing product copy.

### 16.2 Public and private boundaries

Public Profile language is authored presentation: **About**, **Selected Works**, **Works**, **Publications**, and **Links**. Private product language is operational: **Preferences**, **Notifications**, **Integrations**, **Privacy**, **Security**, and **Account**. Do not put private preferences, eligibility information, Tracker activity, submissions, or Library drafts on a public Profile.

Address the person as **you** in product copy. Use **artist**, **writer**, **filmmaker**, or another specific role when known. Use **artists** as a broad marketing term when the audience includes several disciplines. Avoid **creatives** as a default noun.

Use **people** rather than **users** in public copy. **User** is acceptable in technical, legal, analytics, and research documentation.

## 17. Mechanics

### 17.1 Capitalization

- Use sentence case for headings, buttons, labels, and email subjects.
- Write **Missa**, not **MISSA**, unless the wordmark styling is purely visual.
- Render brand identity with the canonical `MissaWordmark` component and supplied SVG artwork. Do not imitate the wordmark with typed letters, tracking, or a substitute font.
- Capitalize official product names only.
- Do not use all caps in source text.

### 17.2 Punctuation

- Use full stops for complete sentences.
- Do not put full stops on buttons, labels, or short statuses.
- Use exclamation marks rarely and never in errors, payments, eligibility, deadlines, or decisions.
- Use em dashes only when they make a sentence easier to read. Do not use them to attach a slogan or emotional payoff.
- Use ellipses only for work in progress: **Saving…**

### 17.3 Dates and time

- Use an unambiguous date: **7 August 2026** or a correctly localized equivalent.
- Include the time zone with deadline times.
- Preserve the official source time and time zone.
- Use relative time only with the exact date available nearby.

### 17.4 Money

- Use a currency code when the symbol is ambiguous: **$25 USD**, **$25 CAD**.
- Do not write **Free** unless the official source confirms there is no fee.
- Distinguish an application fee from travel, materials, membership, or participation costs.

### 17.5 Links

Name the destination:

- Read official guidelines
- View submission
- Update profile
- Contact the organization

Do not use **Click here**.

### 17.6 Accessibility and localization

- Labels must remain visible. Placeholders do not replace labels.
- Link and button text must make sense out of context.
- Do not communicate status with color or position alone.
- Do not give directional instructions when the control has a name.
- Avoid idioms in instructions and high-stakes copy.
- Use the person's or community's stated identity language.
- Do not assume a US address, currency, time zone, tax system, or payment method.
- Preserve official regional spelling in names and quotations.

## 18. Before and after

| Reject | Use |
| :-- | :-- |
| Find the calls that fit your work, all in one calmer place. | Find your next opportunity. |
| Your work is specific. Your opportunities should be too. | Find opportunities that fit your work. |
| No password yet. Just a note when Missa is ready for you. | We’ll send you an invite when Missa is ready. |
| Unlock personalized opportunities powered by AI. | See opportunities based on your field, location, and preferences. |
| Never miss another deadline. | Add deadlines to your calendar. |
| This is a perfect match. | This may fit because the call accepts poetry and is open to writers in Nigeria. |
| Your work is out in the world. | Submission sent. |
| Start your submission journey. | Start application. |
| Give every application a clear way in. | Publish the requirements before opening the call. |
| Run a thoughtful call without the maze. | Publish the call, assign reviewers, and send decisions. |
| Something went wrong. | We could not save your profile. Try again. |
| No data yet. | No submissions yet. |
| Successfully submitted. | Submission sent. |
| Fee unclear. | Fee not stated. |
| Check is aging. | *(Do not expose backend freshness state in customer copy.)* |
| We understand how disappointing this can be. | The organization declined this submission. |

## 19. Instructions for AI-assisted writing

Use this prompt with the relevant facts, surface, and action:

```text
Write for Missa.

Missa is plain, specific, and familiar. Say what the person needs to know and
stop. Give the message one job. Put the answer, state, or action first. Add a
second sentence only when it supplies a necessary fact, consequence, reason,
source, next action, or recovery step.

Do not add warmth, reassurance, hope, celebration, a metaphor, or a brand
observation. Do not infer feelings. Do not use “No X. Just Y,” “From X to Y,”
“Whether you…,” “At Missa, we believe…,” journey language, rhetorical triplets,
or a “so you can focus on what matters” ending.

Use ordinary field terms. Name the object and action. Do not invent facts.
Keep unknown information unknown. Do not mention AI in marketing copy. When a
recommendation, summary, or change is shaped by AI, name the relevant inputs,
source, limitation, or user control.

Return one best draft. Do not explain the writing unless asked.
```

Required input:

- surface;
- audience;
- message job;
- facts;
- unknown facts;
- desired action;
- length limit;
- source, date, and time zone when relevant.

If a missing fact could change eligibility, cost, deadline, privacy, or outcome, ask for it or mark it as unconfirmed.

## 20. Release test

Copy does not ship if any answer is **no**.

### Meaning

- Is the main point in the first sentence?
- Does the message do one job?
- Does every additional sentence add information?
- Could a person understand it once, without brand context?

### Accuracy

- Are names, dates, fees, requirements, and statuses exact?
- Are source facts separate from Missa's interpretation?
- Are unknowns still unknown?
- Does the confidence match the evidence?

### Action

- Is the next action clear when one is required?
- Does the button name what will happen?
- Does an error include a useful recovery step?
- Is the consequence clear for destructive or irreversible actions?

### Language

- Is the sentence ordinary enough to say aloud?
- Has decorative warmth been removed?
- Has repeated meaning been removed?
- Are banned constructions and filler words absent?
- Is the copy within the component limit?

### Safety and access

- Does the copy avoid assuming feelings, ability, identity, or location?
- Does it work without color, position, or visual context alone?
- Are high-stakes decisions direct and free of jokes?
- Has a qualified person reviewed legal, payment, eligibility, security, or sensitive decision copy?

## 21. Governance

- Product owns interface terms, actions, states, and component limits.
- Brand owns marketing expression.
- Editorial owns public guides and source presentation.
- Support owns recovery instructions.
- Legal, privacy, accessibility, and security owners approve copy in their domains.
- Organizations own their program requirements and decisions.

Add a new rule only when a repeated problem appears in real copy. Include the bad example, the replacement, and the surfaces affected.

Do not add a new adjective to the voice. Add an observable writing rule.

Review this guide against live Missa copy before each minor version. Keep the quick reference aligned.

## 22. References and provenance

Reviewed 7 August 2026.

### Submittable

- [Discover](https://www.submittable.com/discover): direct promise, literal supporting copy, clear CTA, and a short numbered explanation.
- [Why do I need a Submittable account?](https://submittable.help/en/articles/923475-why-do-i-need-a-submittable-account-to-make-a-submission): question-led help, answer first, familiar explanations, and explicit product boundaries.

Missa adopts Submittable's directness, not its wording or broader enterprise voice.

### Chill Subs

- [Chill Subs](https://www.chillsubs.com/): compact positioning and confidence in audience-specific language.
- [Getting started](https://support.chillsubs.com/faq/quickstart): direct help for writers using familiar submission terminology.
- [How to add published work](https://support.chillsubs.com/how-tos/how-to-add-published-work-to-your-chill-subs-profile): personality used in a low-stakes instructional context.

Missa adopts Chill Subs' familiarity with creative work, not its writer-only scope, exact jokes, or anti-AI positioning.

### Missa

- [Homepage](https://www.usemissa.com/)
- [Residencies](https://www.usemissa.com/discover/residencies)
- [Poetry opportunities](https://www.usemissa.com/discover/poetry)

These pages were reviewed for current terminology, evidence states, recommendation language, and repeated copy patterns. The examples in this guide replace the earlier “calm purpose” and “community warmth” framework.

## 23. Change log

| Version | Date | Change |
| :-- | :-- | :-- |
| 2.0 | 7 August 2026 | Rebuilt the guide around plain, specific, familiar language; removed voice formulas and phrasebanks; added strict component limits, banned constructions, AI rules, and source references. |
| 1.1 | 7 August 2026 | Previous voice architecture and execution companion. Retired. |
| 1.0 | 7 August 2026 | Original guide. Retired. |
