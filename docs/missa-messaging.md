---
title: Missa messaging and microcopy
status: proposed, waiting on four founder decisions (see the end)
last_updated: "2026-10-06"
north_star: Notion's plain marketing and product voice
---

# Missa messaging and microcopy

Use this when you write anything a person reads: the homepage, a page title, a
button, an email, a post or a film. Once approved, it replaces the messaging
hierarchy in `missa-value-and-positioning.md` and the canonical homepage copy in
`missa-content-quick-reference.md`.

## The idea

Every artist has two jobs. The first is making the work. The second is getting
it out: hearing about the call in time, working out whether you're eligible,
finding the fee, reading the guidelines, making the deadline in the right time
zone, remembering what you sent where, and waiting.

Missa does most of the second job, so there's more of you left for the first.
Missa never touches the first job. It doesn't write, judge or rewrite anyone's
work, and nothing trains on it.

This idea is a compass for the team, not a line for the site. Every headline,
email and post should be about some piece of the second job.

## The lines

| Use | Line |
| --- | --- |
| Homepage headline and tagline | Find the call. Make the deadline. |
| Homepage subhead | Open calls, grants, residencies and magazines, with the fee, the rules and a reminder before each one closes. |
| Buttons | Browse open calls · Get Missa free |
| Who it's for | For writers, artists, filmmakers, and everyone in between. |
| About headline | Making the work is half the job. |
| About subhead | The other half is finding where to send it, keeping the dates and remembering what went where. Missa does most of that half. |
| One sentence (meta, `llms.txt`, press) | Missa is a free site where artists and writers find open calls, grants, residencies, magazines and prizes, see the fee, who can apply and the official page for each, and get reminded before they close. |
| Film end card | Missa. Find the call. Make the deadline. |
| Two words | Open calls. |

## North star: Notion

Take Notion's plainness. Leave its AI positioning and its adjective triplets
("Simple. Powerful. Beautiful.").

| Notion's move | Notion writes | Missa writes |
| --- | --- | --- |
| Section headlines are verbs | Take notes · Get organized · Track tasks | Find calls · Check the details · Get reminded · Keep track |
| One sentence of everyday examples | Your budget, recipes, articles to read… | Residencies, grants and the magazine that only reads in March, picked for what you make. |
| One light turn, at most | Get your team on the same page, literally. | Make the deadline. Literally, this time. |
| Name the people, then everyone | For PMs, designers, engineers, and everyone in between | For writers, artists, filmmakers, and everyone in between |
| The button says the product and the price | Get Notion free | Get Missa free |
| Plans say who they're for | For individuals to organize personal projects and life. | Free: for anyone looking for their next call. Plus: for people who send a lot of work out. |
| FAQ answers come first | What is a block? A block is any single piece of content… | What's an open call? Anything that asks for your work: a magazine reading submissions, a residency, a grant, a prize. |
| Placeholders teach | Type '/' for commands | Search calls, organizations or "no fee" |

## Four things to say

Each one is true today. Keep the proof current before you use it.

1. **Find calls.** Residencies, grants, magazines and prizes, picked for what you
   make and where you live. The Sunday List brings new ones every week.
   Proof: onboarding asks "What do you make?" and "Where are you based?"
   (`apps/web/components/creator-onboarding.tsx`); `apps/web/emails/weekly-digest.ts`;
   `apps/web/emails/alert-digest.ts`.
2. **Check the details.** The fee, who can apply and what to send, with the
   organizer's own page one tap away. If the page doesn't say, neither do we.
   Proof: catalogue labels such as "No fee" and "Fee not listed"; `apps/web/app/methodology`.
3. **Get reminded.** Two weeks before, a week before, three days before, the day
   before. In your time zone, never during your quiet hours. If a deadline moves
   or a call closes early, you'll hear.
   Proof: `apps/web/components/notification-preferences-panel.tsx`;
   `apps/web/emails/deadline-moments.ts`; `apps/web/emails/email-choice-confirmation.ts`.
4. **Keep track.** What you sent, where and when, and who still owes you a reply.
   Bring your old spreadsheet with you.
   Proof: CSV import at `/import` (`apps/web/components/tracker-import-stepper.tsx`);
   the "Still waiting on {organization}?" check-in in `deadline-moments.ts`.

## How it sounds

1. **Sound like a working artist, not a platform.** "Missa keeps track of your
   calls, so your notes app doesn't have to." Not "Missa helps creators
   understand and track Opportunities."
2. **Be specific.** A month, a fee, a time zone. "Calls turn up in newsletters,
   group chats and a friend's story the day after they close."
3. **Say what we don't know.** "Check us. Every call links to the organizer's
   page, and anything we couldn't confirm is marked." Not "Can I trust Missa? Yes."
4. **Have fun, the dry kind.** See "Fun" below for where it belongs and where
   it never goes. "Some writers aim for 100 rejections a year. Pick your number."
5. **The work is theirs.** We handle the admin and never comment on the work.
   Don't promise odds, fit scores or acceptance.
6. **In hard moments, plain words and a next step.** "Declined. It's saved with
   the rest. Where's it going next?"

The emails already sound like this ("It closes today, {name}.", "Still waiting
on {organization}?", "The deadline moved."). Keep them as they are. The job is
to make the marketing pages sound like the inbox.

## Fun

Missa should make people smile a few times a week. Use the jokes creators
already make about the submission life: the open tabs, the colour-coded
spreadsheet, the nine-month wait, the goal of 100 rejections a year. Laugh with
them about the admin. Never laugh at the work or at the person.

1. **Joke about the admin, never the work.**
2. **Use their jokes, not ours.** Tabs, spreadsheets, reading periods, response
   times and rejection counts are shared ground.
3. **One per screen.** If it needs explaining, cut it.
4. **Never when it costs something.** No jokes near money, eligibility, a
   deadline that's today, or a "no".
5. **The joke can't bend a fact.** Only say "we did the maths" if we did.
6. **Exclamation marks are for acceptances.** No emoji in the product UI.

### How much fun, where

| Dial | Surfaces |
| --- | --- |
| High | Social posts, the film and cutdowns, launch emails |
| Medium | Empty states, 404, onboarding hints, first run, success toasts, The Sunday List intro, import, goals |
| Low | Homepage sections, feature tabs, check-in emails, unsubscribe |
| None | Buttons, statuses, errors, fees, eligibility, deadline-day reminders, declines, decision letters, payments, legal |

### Lines to start from

| Where | Line |
| --- | --- |
| Empty Tracker | Nothing saved yet. Your open tabs can finally rest. |
| First save | Saved. One less tab. |
| Marked as sent | Marked as sent. Go make something while they read. |
| Reminder set | Reminder set for 14 March. We'll do the remembering. |
| Import | Bring your spreadsheet. Yes, even that one. |
| Import done | 47 submissions imported. Your spreadsheet can retire now. |
| Onboarding, "What do you make?" | Pick everything. Poets who paint are welcome. |
| Onboarding, location | Lots of calls care where you live. We'll tell you which ones. |
| Accepted | Accepted! Read it three times? Everyone does. |
| Still waiting | It's been 92 days. They said 60. A polite nudge is allowed. |
| Goals | Some writers aim for 100 rejections a year. Pick your number. |
| 404 | This page closed early. Plenty of calls haven't. |
| Loading | Reading the fine print… |
| No results | No calls match that. Try fewer filters, or check back Sunday. |
| Unsubscribe from The Sunday List | Unsubscribed. Sundays are yours again. |
| Log out | See you next call. |
| Social | Your open tabs called. They'd like a break. |
| Social | That magazine that only reads in March? It's on the calendar. |

Declines stay plain: "Declined. It's saved with the rest. Where's it going next?"

## Words

**Say:** open call, call, deadline, fee, reading period, residency, grant,
magazine, prize, what you make, your work, send, the organizer's page, not
listed, you.

**Don't say:** creator (in headlines), content, platform, layer,
infrastructure, operate, capability, per-Work, Opportunity with a capital O,
submitter, tailored for you, smart, ✨, odds, AI-powered, journey, unlock,
brings them together.

Why not "creator": to many writers and artists it now reads as "content
creator", and some reject it loudly. People call themselves writers, poets,
artists and filmmakers. When one word has to cover all of them, use "you".

"Opportunities" stays as the catalogue name and nav label. It's also the
everyday search word in Nigeria and across Africa ("opportunities", "fully
funded"). In sentences to a person, say "call".

## Microcopy

| Element | Rule | Example |
| --- | --- | --- |
| Search | The placeholder teaches what you can search | Search calls, organizations or "no fee" |
| Buttons | One or two words. Say exactly what happens | Save · Remind me · Mark as sent · Log a reply · Withdraw |
| Status | One word each, and the same word everywhere | Saved · Sent · Heard back · Accepted · Declined · Withdrawn · Closed |
| Toasts | What happened, plus the one detail that matters | Reminder set for 14 March. We'll do the remembering. |
| Empty states | What goes here, and how to add the first one | Nothing saved yet. Your open tabs can finally rest. |
| Form hints | A plain example instead of a rule | Two or three sentences, the way you'd say it before a reading. |
| Unknowns | Exact and short. Never guess | Fee not listed · Deadline not confirmed |
| Dates | Absolute, local, in the data font | Closes Fri 14 Mar, 11:59 pm your time |
| Big actions | Say what will happen, and what won't | Withdraw from Ploughshares? We'll mark it withdrawn here. You still need to tell them. |
| Errors | What failed, what's safe, what to do next | Couldn't save that. Nothing was lost. Try again. |
| FAQ | Answer in the first word or two | Do I apply through Missa? Usually not. Each call links to the organizer's page, and you apply there. |
| First run | Three steps, like Notion's "Getting started" | Tell us what you make. Save a call. We'll remind you before it closes. |

## One line per audience

| Audience | Line |
| --- | --- |
| Writers and poets | Reading periods, simultaneous submissions and the magazine that only reads in March. Missa keeps the dates. |
| Visual artists | Residencies, open calls and grants, with the fee and who can apply right there on the card. |
| Film, music, performance | Festivals, grants and showcases, with a reminder before each one closes. |
| Artists in Nigeria and West Africa | Opportunities open to people living and working in Nigeria, with the fee in its own currency and the rules up front. |
| Organizations | Post your call where artists already look. Take submissions and answer each piece. |

## Price

Use these only once Plus is live.

- **Free:** for anyone looking for their next call. Finding calls, saving them
  and email reminders are free, and they stay free.
- **Plus:** for people who send a lot of work out. Priced for where you live.
- **Why we charge:** texts cost money, and so does checking thousands of
  organizers' pages. We'll never charge you to see a deadline or the official page.

## Fix these first

These would make the new words untrue.

- The homepage and sign-up images are AI-generated, and their prompt files in
  `apps/web/public/media/home/generated/*.webp.json` are publicly served.
- "Odds", "Smart", "✨" and "Editorial Intelligence & Market Telemetry" on the
  matcher and rankings.
- "Can I trust Missa? Yes.", "Verified Host" and "checked against each
  organisation's official page" claim more than Methodology does.
- About, the waitlist FAQ and `llms.txt` describe the full organization
  workflow. `/for-organizations` marks delivery as planned and review as limited.
- `/waitlist` and `/welcome` are live and in the sitemap, though sign-up is open.
- `landing/` has invented testimonials and stats, and the root `vercel.json`
  still points at it.
- Plus and text reminders appear on `/plan`, in Terms and in Privacy, while the
  positioning doc says they're unreleased.

## How this is enforced

| Layer | What it does | Where |
| --- | --- | --- |
| This guide | The source for every line. `AGENTS.md` sends every AI copy change here. | `docs/missa-messaging.md`, `AGENTS.md` |
| Claude Code hook | After each edit, checks the changed lines in that file and sends failures straight back to the agent to fix. | `.claude/settings.json` |
| CI | Fails a PR that adds a banned word to product copy. Only new or changed lines count, so old copy fails the first time someone touches it. | `npm run check:language`, `scripts/missa-language-rules.mjs` |
| Debt report | Counts the legacy copy still to migrate, by rule. | `npm run check:language:report` |
| Escape hatch | `missa-language-allow: <reason>` on a line keeps a flagged word on purpose, such as a quoted competitor. Reviewers should question every one. | Inline comment |
| People | A script catches words, not tone. The fun dial, specificity and "would a person say this?" still need a reviewer reading against this guide. | PR review |

Before this guide, `check:language` compared only uncommitted changes, so it
passed every PR in CI. It now diffs against the PR's base (`HEAD^1`, with
`fetch-depth: 2`).

With the copy edits, put the lead lines in one module (for example
`apps/web/lib/brand.ts`: the tagline, the one sentence and the audience line).
Have page metadata, the manifest, `llms.txt` and the share images import from
it, with a unit test, so the site can't drift into a 24th description.

When you add a word to "Don't say", add a rule to
`scripts/missa-language-rules.mjs` and a case to
`scripts/tests/check-missa-language.test.mjs`.

## Open decisions

1. **Homepage headline.** Recommended: "Find the call. Make the deadline." The
   alternatives are "Making the work is half the job." (now proposed for About)
   and "The art world runs on deadlines." (from the film).
2. **"Creator" in the film end card and the site title.** Recommended: replace
   it with the tagline.
3. **US or UK spelling.** The app uses US spelling; the emails use UK. Pick one.
4. **A founder note on About.** Recommended: yes, in the founder's own words.

## Evidence

- **Shipped copy:** 23 distinct one-line descriptions of Missa across
  `apps/web`. "Find" appears in 13 of them and "deadline" in 3.
- **History:** 17 headlines in 13 weeks, from git history since 5 July 2026.
  The live homepage headline changed five times.
- **Creators:** about 2,400 public Bluesky posts on calls, deadlines, fees,
  tracking and rejection. Recurring themes are hearing about calls too late,
  open tabs as a filing system, time-zone misses, hidden "tip jar" fees, stale
  listings, colour-coded spreadsheets, months of waiting, rejection goals, and
  "i promise you i know how to write."
- **Market:** writers have deep single-discipline tools (Duotrope, Chill Subs).
  Artists have broad listings with little workflow. No product covers every
  discipline with a deep workflow, and none plays the careful voice that says
  what it couldn't confirm.
- **Notion:** notion.com homepage, Docs, Personal, Calendar, Pricing and the
  help center, read on 6 October 2026.
