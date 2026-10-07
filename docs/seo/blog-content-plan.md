---
title: Missa blog content plan, round one
status: draft for review
last_updated: "2026-10-07"
owner: Adedayo
---

# Missa blog content plan, round one

These are ten articles, each with the research and spec a writer needs to
start. They're meant to win searches and AI answers for the questions artists
and writers ask about the second job: finding the call, checking the fee and
keeping track.

Read `docs/missa-messaging.md` before you write any of them. Every rule there
applies here.

## Contents

1. [Why these ten](#why-these-ten)
2. [What the research is based on](#what-the-research-is-based-on)
3. [Specs every article follows](#specs-every-article-follows)
4. [Publishing order](#publishing-order)
5. [The ten briefs](#the-ten-briefs)
6. [Reserve topics](#reserve-topics)
7. [How to measure it](#how-to-measure-it)

## Why these ten

On 7 October 2026 we asked ChatGPT, with search on, "where can I find open
calls for artists with deadlines and fees". It named ArtConnect, CuratorSpace,
CaFÉ, NYFA, Artenda, ArtRabbit, ArtDeadline and Poets & Writers. It didn't
name Missa. Four patterns explain who got picked:

1. **Deadlines and fees on one page.** Every site it cited shows both together.
   Missa does too.
2. **Named filters, quoted word for word:** "No Fee Application", "$25 and
   Under", "Opportunities without fees". Missa has the same pages
   (`/discover/no-fee-calls`, `/discover/free-contests`,
   `/discover/residencies-no-fee`), but nothing explains them in plain
   language.
3. **The cost after selection.** The answer separated "free to apply" from
   "free to take part". No Missa page explains that difference.
4. **Answers built from roundups.** AI search builds lists like this from
   comparison articles, blogs and Reddit threads. Missa has no comparison
   article for it to read.

Bing Webmaster data for usemissa.com (export of 7 October 2026, 72 queries)
adds a second set of signals. Directory pages already rank at positions 2 to 6
for magazine and residency names, and people arrive asking judgment questions
we don't answer yet:

| Query people used | Avg. position | What it tells us |
| --- | --- | --- |
| how hard is it to get in the paris review | 6 | They want acceptance odds explained |
| paris review poetry acceptance rate | 10 | Same, poetry-specific |
| what are the most reputable literary magazines in north america | 8 | They want a tier list with reasons |
| best literary magazines 2026 | 9 | Same, with a year |
| plop residency application, edward albee foundation application | 2–6 | They want help applying to residencies |
| yaddo residency, djerassi resident artists program, skowhegan | 3–10 | Same, for the big US residencies |

Each brief below targets one of these gaps.

## What the research is based on

| Source | What it gave us | Limits |
| --- | --- | --- |
| Bing Webmaster keyword report, usemissa.com, 7 Oct 2026 | Real queries and positions for Missa | Small sample: 72 queries and about 130 impressions |
| Web search of each target query, 7 Oct 2026 | Who ranks now, what they cover, what they miss | One snapshot, US results |
| ChatGPT answer with search on, 7 Oct 2026 | Who AI answers cite, and why | One answer |
| `docs/missa-messaging.md` | Voice, banned words, provable claims | — |
| The codebase | What Missa can truthfully claim and link to | — |

**What we don't have yet: search volume.** No keyword-volume tool is
connected, so every "demand" note below is a judgment from the SERP, not a
number. Before writing each article:

- run its primary keyword through Bing Webmaster → Keyword Research, which is
  free;
- run it through Google Keyword Planner, or Search Console once the site has
  impressions;
- write the monthly volume into the brief's "Demand" row.

If a primary keyword shows almost no volume, use the strongest secondary
keyword as the primary instead.

## Specs every article follows

### Where articles live

- **URL:** `/guides/<slug>`. That keeps them in the existing guides hub, its
  sitemap entry and its footer links.
- **Code:** today a guide in `apps/web/lib/discoveryGuides.ts` has only an
  answer, FAQs and a live query. Long-form articles need a body. Add an optional
  `body` (Markdown or MDX) to the guide model, or a folder such as
  `apps/web/content/guides/<slug>.md` that the guide page reads.
- **Keep the live list:** every article that matches a catalog query embeds
  that query's open calls under the article (`query` in the guide entry). That's
  the one thing competitors' static posts can't do.
- **Freshness:** bump `discoveryContentLastModified` when an article
  meaningfully changes, so the sitemap `lastmod` is honest.

### On the page

| Element | Spec |
| --- | --- |
| Title tag | 50–60 characters. Primary keyword near the start. The year only where the brief says so. Must pass `brandedTitle()` without doubling "Missa". |
| Meta description | 140–160 characters. Answer the question; don't tease it. |
| H1 | Close to the title tag. It can be longer and more natural. |
| Answer block | The first 40–60 words, directly under the H1, answer the main question in full. AI answers and featured snippets lift this paragraph. |
| H2s | Phrase as the questions people ask (taken from the brief's "Questions to answer"). One idea per section. |
| Tables | At least one per article. Comparison, fee and checklist tables get quoted by AI answers almost word for word. |
| Length | As set in each brief: 1,200–2,500 words. Don't pad to reach it. |
| Byline | A named person with a one-line bio, never "Missa Team". Until the founder note is settled, use the founder's name and role. |
| Dates | "Published" and "Updated" dates, in the page and in the schema. |
| Sources | Link every number and every claim about another product to its source, opening in the same tab. |
| Images | One header illustration, plus diagrams where they explain something. Follow "Images" in the messaging doc. Descriptive alt text. Never call an illustration a photo. |
| Internal links | The links listed in each brief, plus two related articles. Write descriptive anchor text, never "click here". |
| CTA | One, at the end, matching the article. "Browse open calls" or "Get Missa free". Never a pop-up. |

### Structured data

Every article gets:

- `Article`, with `headline`, `datePublished`, `dateModified`, `author` (a
  Person), and `publisher` (the existing Organization entity from
  `siteEntityJsonLd`, so the LinkedIn, Crunchbase and Wikidata `sameAs` links
  come with it);
- `BreadcrumbList`: Missa → Guides → article;
- `FAQPage` only for a real FAQ section that appears on the page.

Comparison and list articles also get an `ItemList`. Never use `JobPosting`,
`Event` or `Review`, and never use star ratings.

### Voice and claims

- **Banned words.** Everything in `docs/missa-messaging.md` → Words. No
  "creator" in headlines, no "platform", no "Opportunity" with a capital O in a
  sentence, no "odds", no "unlock", no "journey".
- **US spelling.** Wrap lines with `<Sp>` only where UK readers are likely.
- **Claims about Missa.** Make only the four claims in the messaging doc ("Find
  calls", "Check the details", "Get reminded", "Keep track"), each with its
  proof. In particular:
  - Missa does **not** publish acceptance rates; the ranking data's
    `acceptanceRate` is null. Never imply it does.
  - Missa doesn't apply for anyone. Say "you apply on the organizer's page".
  - Plus prices only once Plus is live.
- **Claims about competitors.** Must be accurate on the day of publishing and
  sourced to their own page. Be fair, and say what each one does well. The
  comparison articles only work if a reader who uses that product nods along.
  Mark any quoted competitor term with `missa-language-allow:` if the language
  check flags it.
- **Fun dial.** Low for most of the body, and none near fees, eligibility,
  scams or rejection. One dry line in the intro at most.
- **Before merging,** run `npm run check:language`.

### For AI answers (GEO and AEO)

- Put the answer first, then the detail. Each H2 should open with a sentence
  that makes sense quoted alone.
- Use real names and numbers, sourced: "CaFÉ shows the fee on each card".
  Avoid vague claims like "some sites show fees".
- Define terms in one sentence each, for example: "A hanging fee is what an
  exhibition charges you to show work after you've been selected."
- Add each published article to `apps/web/public/llms.txt` under a "Guides"
  section.
- Submit each new URL through IndexNow on the day it goes live (the
  `indexnow-refresh` workflow), and through Bing and Google URL inspection.

### Off-site distribution, which gets articles cited

AI answers lean on roundups and forum threads, so each article needs a
distribution step:

- **Reddit:** answer an existing thread in a relevant subreddit (r/poetry,
  r/writing, r/Art, r/artbusiness, r/photography). Answer the question in full
  in the thread and link the article only where it adds something.
- **Newsletters and roundups:** pitch the comparison article (1) to blogs and
  newsletters that run "where to find open calls" posts, and ask to be added
  to their lists.
- **Bluesky:** post one line from the article with the link. Writers and
  artists already talk about fees and tracking there; see the Evidence section
  of the messaging doc.

## Publishing order

| # | Article | Why this slot |
| --- | --- | --- |
| 1 | Where to find open calls: 10 sites compared | Answers the exact AI query we're missing |
| 2 | Free to apply vs. free to take part | Explains the "cost after selection" point AI answers make |
| 3 | Duotrope alternatives | High buying intent, and Missa's tracker and import are real |
| 4 | Literary magazine acceptance rates | Bing shows people already reach Missa with this question |
| 5 | How to apply to an artist residency | Bing shows residency application queries at positions 2–6 |
| 6 | Residencies with no application fee | Supports `/discover/residencies-no-fee` |
| 7 | Fully funded opportunities in Nigeria and Africa | A priority audience in the messaging doc |
| 8 | Best literary magazines, by tier | Supports `/rankings/magazines` |
| 9 | Submission fees and tip jars | Writers' side of article 2 |
| 10 | How to spot a scam open call | Trust page; links from every fee article |

Publish one or two a week. Hold article 8 until 4 is live, because 8 links to
4.

---

## The ten briefs

### 1. Where to find open calls: 10 sites compared

| | |
| --- | --- |
| Slug | `/guides/where-to-find-open-calls` |
| Title tag | Where to Find Open Calls for Artists and Writers (2026) |
| H1 | Where to find open calls: 10 sites compared |
| Meta description | Ten places artists and writers find open calls, grants and residencies, compared by coverage, fees shown, deadline reminders and price. |
| Primary keyword | where to find open calls for artists |
| Secondary | open call websites, best sites for art opportunities, artist opportunity websites, ArtConnect alternatives, CuratorSpace alternatives, open calls for writers |
| Intent | Commercial investigation |
| Demand | Not measured yet; see above. The SERP is busy with roundups, which suggests steady demand. |
| Audience | Artists and writers looking for somewhere new to find calls |
| Length | 2,000–2,500 words |
| Schema | Article, BreadcrumbList, ItemList (the ten sites), FAQPage |
| CTA | Browse open calls |

**Who ranks now.** EntryThingy's "trusted art call platforms" post; Zealous's
list of 16 platforms; Booooooom's open calls page; the Only For Artists
directory; Colossal's monthly opportunities post. AI answers cite ArtConnect,
CuratorSpace, CaFÉ, NYFA, Artenda, ArtRabbit, ArtDeadline and Poets & Writers.

**What they miss.** Each list either covers visual art or writing, never both,
and none puts the fee, reminder and tracking details in one table. They're
also written by a platform ranking itself first without saying so.

**Our angle.** The comparison an artist who writes, or a writer who paints,
would want: one table across disciplines, with honest notes, and Missa listed
with its limits, such as "you apply on the organizer's page". Say plainly at
the top that Missa wrote this and is on the list.

**Questions to answer (H2s):**
- What's the best site to find open calls? (Answer: it depends on what you
  make. Then the table.)
- Which sites show the entry fee before you click?
- Which sites remind you before a deadline?
- Which are free, and what do the paid ones add?
- Where do writers find magazine calls and contests?
- Where do artists outside the US and UK find calls?

**Outline:**
1. Answer block: the three to pick by discipline, in one paragraph.
2. Comparison table. Columns: site · disciplines · regions · fee shown on
   listing · no-fee filter · deadline reminders · tracking · price.
3. One section per site, about 120 words each: who it's best for, one
   strength, one limit, with a source link. Suggested ten:
   - ArtConnect
   - CuratorSpace
   - CaFÉ
   - NYFA Opportunities
   - Artenda
   - ArtRabbit
   - Submittable Discover
   - Poets & Writers
   - Chill Subs
   - Missa
4. How to use more than one without losing track. Bridge to the tracker.
5. FAQ.

**Facts to check on publishing day.** Every competitor's price, its filters
(ArtConnect's "Opportunities without fees", CaFÉ's "$25 and Under", NYFA's
"No Fee Application", CuratorSpace's "How much does it cost?" field), and its
reminder features. The ChatGPT answer of 7 Oct 2026 is only a lead; confirm
each one on the product's own site.

**Internal links:**
- `/opportunities`
- `/discover/no-fee-calls`
- `/discover/closing-this-week`
- `/directory`
- `/countries`
- articles 2 and 3

**Sources to cite:** each product's own pricing or features page.

---

### 2. Free to apply vs. free to take part: entry, hanging and participation fees

| | |
| --- | --- |
| Slug | `/guides/entry-fees-hanging-fees-participation-fees` |
| Title tag | Art Entry Fees, Hanging Fees and Participation Fees Explained |
| H1 | Free to apply isn't always free: the fees an open call can charge |
| Meta description | Entry, jury, hanging, participation and commission fees explained, with what's normal, what's a warning sign, and how to see every cost before you apply. |
| Primary keyword | art competition entry fees |
| Secondary | hanging fee artist, participation fee art exhibition, pay to play art shows, are art competition fees worth it, jury fee, free open calls for artists |
| Intent | Informational |
| Demand | Not measured. Forum threads in the SERP point to a long-running, unresolved question. |
| Audience | Visual artists and photographers deciding whether a call is worth the money |
| Length | 1,500–1,800 words |
| Schema | Article, BreadcrumbList, FAQPage |
| CTA | Browse no-fee calls (`/discover/no-fee-calls`) |

**Who ranks now.** Old Reddit threads; EntryThingy on scam calls; Working Class
Creatives Database on "Should I pay fees to show my art?"; The Abundant Artist.
None defines each fee clearly or puts them all in one table.

**Our angle.** Name every fee, say when you pay it, and give a plain test for
each. Use the real example from the ChatGPT answer: a call that's free to enter
but charges selected artists a £50 participation fee. Confirm it's still live
before you use it, or use another sourced example.

**Questions to answer (H2s):**
- What's the difference between an entry fee and a hanging fee?
- Is a participation fee after selection normal?
- How much is a normal entry fee for a juried show?
- Are pay-to-play galleries worth it?
- What should "free" mean on a listing?
- How do I find every cost before I apply?

**Fee table (the centerpiece).** Columns: fee · when you pay · typical range ·
when it's fair · warning sign. Rows:
- entry or jury fee;
- per-artwork fee;
- hanging or wall fee;
- participation fee after selection;
- commission on sales;
- shipping and insurance;
- catalog or "marketing package".

Every typical range must be sourced, or written as "varies" if we can't source
it.

**Missa tie-in.** Missa shows the fee on each card, and marks "Fee not listed"
when the organizer's page doesn't say. Proof: the catalog labels and
`/methodology`. Don't claim Missa catches fees charged after selection unless
the code shows it does.

**Internal links:**
- `/discover/no-fee-calls`
- `/discover/free-contests`
- `/guides/no-fee-submission-opportunities`
- `/methodology`
- articles 9 and 10

---

### 3. Duotrope alternatives: free and paid submission trackers compared

| | |
| --- | --- |
| Slug | `/guides/duotrope-alternatives` |
| Title tag | Duotrope Alternatives: Free Submission Trackers Compared |
| H1 | Duotrope alternatives for tracking your submissions |
| Meta description | Free and paid alternatives to Duotrope for finding markets and tracking submissions: the Submission Grinder, Chill Subs, spreadsheets, Missa and more. |
| Primary keyword | duotrope alternative |
| Secondary | free duotrope alternative, submission tracker for writers, submission grinder vs duotrope, chill subs vs duotrope, track literary submissions |
| Intent | Commercial investigation |
| Demand | Not measured. Duotrope is paid, and the ranking posts are years old (2015–2020), so the field is stale. |
| Audience | Writers and poets who submit regularly |
| Length | 1,800–2,200 words |
| Schema | Article, BreadcrumbList, ItemList, FAQPage |
| CTA | Get Missa free, then "Bring your spreadsheet" (`/import`) |

**Who ranks now.** Bryan Thomas Schmidt's "8 Good Options to Duotrope", from
years ago; Nathaniel Tower's "Is a Duotrope subscription worth the cost?" from
2020; a Writing Forums thread. Several of the tools they name have since closed
or changed. That's the opening.

**Our angle.** An up-to-date, fair comparison that says what Duotrope does
best, such as its acceptance statistics and response-time data, before the
alternatives.

**Questions to answer (H2s):**
- Is there a free alternative to Duotrope?
- What does Duotrope do that others don't?
- Submission Grinder vs. Duotrope
- Chill Subs vs. Duotrope
- Should I just use a spreadsheet?
- How do I move my submission history from a spreadsheet?

**Comparison table.** Columns: tool · price · market database · tracking ·
response-time data · acceptance statistics · deadline reminders · import from
a spreadsheet. Rows:
- Duotrope
- The Submission Grinder
- Chill Subs
- Submittable (your own submissions)
- Writer's Planner, if it still exists
- a spreadsheet
- Missa

**Missa claims allowed:**
- "Keep track" and "Get reminded", with their proofs in the messaging doc;
- CSV import at `/import`;
- the "Still waiting on…?" check-in;
- Missa covers art, film and music calls too.

Not allowed: acceptance statistics, which Missa doesn't publish.

**Facts to check on publishing day.** Duotrope's current price; whether the
Grinder is still free and ad-supported; Chill Subs' current features and
price; whether Writer's Planner and Sonar still exist.

**Internal links:**
- `/import`
- `/tracker`
- `/journals`
- `/rankings/magazines`
- article 4

---

### 4. Literary magazine acceptance rates: how hard is it to get in?

| | |
| --- | --- |
| Slug | `/guides/literary-magazine-acceptance-rates` |
| Title tag | Literary Magazine Acceptance Rates: How Hard Is It to Get In? |
| H1 | Literary magazine acceptance rates, and what they don't tell you |
| Meta description | What's known about acceptance rates at The Paris Review and other top magazines, where the numbers come from, and how to build a sensible submission list. |
| Primary keyword | literary magazine acceptance rates |
| Secondary | paris review acceptance rate, how hard is it to get into the paris review, paris review poetry acceptance rate, new yorker acceptance rate, most selective literary magazines |
| Intent | Informational |
| Demand | Bing shows real searches reaching Missa today: "how hard is it to get in the paris review" at position 6, "paris review poetry acceptance rate" at position 10. |
| Audience | Writers and poets deciding where to send work |
| Length | 1,500–2,000 words |
| Schema | Article, BreadcrumbList, FAQPage |
| CTA | Browse magazines reading now (`/discover/magazines`) |

**Who ranks now.** Duotrope and Chill Subs listing pages, whose statistics come
from their users' own reports; the Poetry Foundation blog post "Unacceptance at
the Paris Review"; Chill Subs' "most competitive lit mags" list. Chill Subs
shows A Public Space at about 0.4%. Duotrope shows The Paris Review responding
in about 102 days on average.

**Our angle.** Explain where acceptance rates come from (user-reported tracker
data, not the magazines themselves), why they're rough, and what to do with
them. Never present a number as official unless the magazine published it.

**Questions to answer (H2s):**
- What's The Paris Review's acceptance rate?
- Where do acceptance-rate numbers come from?
- What's a normal acceptance rate for a literary magazine?
- How long do top magazines take to respond?
- Should I still submit to magazines that accept under 1%?
- How do I build a submission list across tiers?

**The table.** Columns: magazine · reported acceptance rate · source · reported
response time · source · reading period. Use 8–12 well-known magazines, with
every number linked to Duotrope or Chill Subs and dated. If a magazine has
published its own figures, use those and say so.

**The rule.** Missa does not publish acceptance rates. Write "according to
Chill Subs users" or "Duotrope reports". Point to the response-time band and
simultaneous-submission policy on Missa's magazine rankings, which are real
fields.

**Fun dial.** One line from the messaging doc is allowed: "Some writers aim for
100 rejections a year. Pick your number."

**Internal links:**
- `/rankings/magazines`
- `/journals`
- `/discover/magazines`
- the Paris Review profile page, if it exists
- articles 8 and 3

---

### 5. How to apply to an artist residency, and what panels look for

| | |
| --- | --- |
| Slug | `/guides/how-to-apply-artist-residency` |
| Title tag | How to Apply for an Artist Residency: A Step-by-Step Guide |
| H1 | How to apply to an artist residency |
| Meta description | What residency applications ask for, how panels choose, and a checklist for Yaddo, MacDowell and smaller residencies, from work samples to references. |
| Primary keyword | how to apply for an artist residency |
| Secondary | artist residency application tips, writing residency application, yaddo application, macdowell application, residency proposal example, residency work samples |
| Intent | Informational |
| Demand | Bing shows Missa residency profiles at positions 2–6 for application queries (PLOP, Edward Albee Foundation, Yaddo, Djerassi). |
| Audience | Visual artists and writers applying to their first or next residency |
| Length | 1,800–2,200 words |
| Schema | Article, BreadcrumbList, FAQPage. Add HowTo only if Google still shows it for this query; otherwise leave it out. |
| CTA | Browse residencies (`/discover/residencies`) |

**Who ranks now.** Format's step-by-step guide; Steve Giovinco's PDF and post;
NYFA's Yaddo spotlight; a Substack guide by Prince Shakur. Common advice: have
the statement, CV and samples ready; samples should fit the proposal; panels
rotate each season.

**Our angle.** A working checklist with a real calendar: when the big US
residencies read, what each asks for, and how to reuse one set of materials
across five applications.

**Questions to answer (H2s):**
- What does a residency application ask for?
- How do residency panels choose?
- What makes a strong work sample?
- How do I write a residency proposal?
- Do I need references, and when do I ask?
- How many residencies should I apply to at once?
- What does a residency cost, and which ones pay you?

**Table.** Columns: residency · disciplines · application window · fee ·
stipend · what to send. Cover 6–8 residencies:
- Yaddo
- MacDowell
- Djerassi
- Skowhegan
- the Edward Albee Foundation
- PLOP
- one outside the US

Confirm every window and fee on the residency's own page, link it, and date
the table.

**Missa tie-in.** Save each residency; reminders go out two weeks, one week,
three days and one day before. Their profile pages show open calls.

**Internal links:**
- `/residencies`
- `/rankings/residencies`
- `/discover/residencies`
- `/discover/residencies-no-fee`
- the residency profiles named in the table
- article 6

---

### 6. Residencies with no application fee, and the ones that pay you

| | |
| --- | --- |
| Slug | `/guides/free-artist-residencies` |
| Title tag | Free Artist Residencies: No Application Fee, Some Fully Funded |
| H1 | Artist residencies with no application fee |
| Meta description | How to find residencies that are free to apply to, which ones cover travel, housing or a stipend, and what "fully funded" usually leaves out. |
| Primary keyword | free artist residencies |
| Secondary | fully funded artist residencies 2026, paid artist residencies, residencies with stipend, no application fee residency, funded writing residencies |
| Intent | Informational, close to transactional |
| Demand | Not measured. ArtConnect has a dedicated page, which suggests demand. |
| Audience | Artists and writers who can't pay to apply or to attend |
| Length | 1,200–1,600 words, plus the live list |
| Schema | Article, BreadcrumbList, FAQPage |
| CTA | See all no-fee residencies (`/discover/residencies-no-fee`) |

**Who ranks now.** ArtConnect Magazine's "Paid Residencies Without Application
Fees" (a dated list); council and gallery pages; thin aggregator pages.

**Our angle.** Static lists go stale within weeks. This article explains what
"free" and "fully funded" usually include and leave out, and embeds the live
query for open no-fee residencies (`feeStatus: 'no-fee'` with the residency
type). That's the difference no static list can match.

**Questions to answer (H2s):**
- Are there artist residencies with no application fee?
- What does "fully funded" usually cover?
- What does it leave out: travel, visas, materials, lost income?
- Do any residencies pay a stipend?
- Are free residencies harder to get into?

**Table.** Columns: what's covered · how often it's covered in free residencies
· what to ask. Rows:
- application fee
- housing
- studio
- stipend
- travel
- visa
- meals
- materials
- family or access needs

Frame it as questions to ask, since we can't source a percentage.

**Internal links:**
- `/discover/residencies-no-fee`
- `/discover/residencies`
- `/rankings/residencies`
- articles 5 and 7

---

### 7. Fully funded opportunities for artists and writers in Nigeria and across Africa

| | |
| --- | --- |
| Slug | `/guides/fully-funded-opportunities-nigeria-africa` |
| Title tag | Fully Funded Opportunities for Nigerian and African Artists |
| H1 | Fully funded opportunities for artists and writers in Nigeria and Africa |
| Meta description | Residencies, grants and prizes open to artists and writers living in Nigeria and across Africa, with what "fully funded" covers and how to check eligibility. |
| Primary keyword | fully funded opportunities for artists in Nigeria |
| Secondary | opportunities for African artists 2026, fully funded residencies for Africans, grants for Nigerian writers, opportunities for African writers, art residency Nigeria |
| Intent | Informational, close to transactional |
| Demand | Not measured. Per the messaging doc, "opportunities" and "fully funded" are the everyday search words in Nigeria and across Africa. |
| Audience | Artists and writers living and working in Nigeria and West Africa |
| Length | 1,500–1,800 words, plus the live list |
| Schema | Article, BreadcrumbList, FAQPage |
| CTA | Browse calls open to Nigeria (`/countries/nigeria`, or the correct country slug) |

**Who ranks now.** Opportunity Desk; the G.A.S. Foundation's own pages (its
Fellowship Award 2026 for Nigerian artists and writers); Culture Pays on
Substack; LinkedIn posts. The RESONANCE residency (ART X Lagos, the Cité
internationale des arts and the Institut Français) appears in roundups.

**Our angle.** Eligibility is the hard part: "open internationally" often
excludes some countries, or needs a visa you can't get in time. Explain how to
check it, then show the live list filtered to calls open to people in Nigeria.
This is the one article where "opportunities" can lead, since it's the search
word. Use "call" in the sentences.

**Questions to answer (H2s):**
- What does "fully funded" mean on an opportunity?
- Which residencies and grants are open to Nigerian artists?
- How do I check whether "international" includes Nigeria?
- What about visas and travel for residencies abroad?
- Are there opportunities in Nigeria itself?
- How do I pay entry fees in naira, or avoid them?

**Facts to check on publishing day.** Each named program's current window and
eligibility, on its own site. Don't publish a deadline that has passed.

**Internal links:**
- `/countries/nigeria`, or the canonical slug from `CANONICAL_COUNTRIES`
- `/countries`
- `/discover/residencies-no-fee`
- `/discover/grants`
- article 6

---

### 8. The best literary magazines to submit to, by tier

| | |
| --- | --- |
| Slug | `/guides/best-literary-magazines-to-submit-to` |
| Title tag | Best Literary Magazines to Submit To in 2026, by Tier |
| H1 | The best literary magazines to submit to, by tier |
| Meta description | How writers tier literary magazines, which ones sit at the top and why, and how to build a submission list that moves from top tier down. |
| Primary keyword | best literary magazines to submit to |
| Secondary | most reputable literary magazines, top literary magazines 2026, literary magazine tiers, best poetry magazines to submit to, prestigious literary journals |
| Intent | Commercial investigation |
| Demand | Bing: "what are the most reputable literary magazines in north america" at position 8, "best literary magazines 2026" at position 9. |
| Audience | Writers and poets building a submission list |
| Length | 1,800–2,200 words |
| Schema | Article, BreadcrumbList, ItemList, FAQPage |
| CTA | See the full Missa magazine rankings (`/rankings/magazines`) |

**Who ranks now.** Clifford Garstang's 2026 rankings, based on Pushcart Prizes;
Reedsy's lists; Chill Subs' "most competitive" list; Celadon Books; ghostwriting
agencies' listicles, which are weak and beatable.

**Avoid cannibalization.** `/rankings/magazines` is the list. This article is
the how and why: what tiers mean, which signals make a magazine "top tier"
(prize anthologies, pay, editors, readership), and how to use tiers. Link to
the rankings for the full list instead of repeating it. Show 10–15 examples,
each with one line on why.

**Questions to answer (H2s):**
- What makes a literary magazine "top tier"?
- Which literary magazines are the most reputable?
- What are the best magazines for poetry? For fiction? For essays?
- Which top magazines pay writers?
- How should I order my submissions across tiers?
- Are newer online magazines worth submitting to?

**Method note.** Say how Missa's index ranks magazines: anthology accolades,
contributor pay, turnaround speed and submission access, per the
`/rankings/magazines` description and `/rankings/methodology`. Name Garstang's
Pushcart-based method as another way to rank, with a link.

**Internal links:**
- `/rankings/magazines`
- `/rankings/methodology`
- `/journals`
- `/discover/poetry`
- `/discover/fiction`
- `/discover/creative-nonfiction`
- articles 4 and 9

---

### 9. Submission fees, reading fees and tip jars: when to pay

| | |
| --- | --- |
| Slug | `/guides/literary-magazine-submission-fees` |
| Title tag | Literary Magazine Submission Fees and Tip Jars: Should You Pay? |
| H1 | Submission fees and tip jars: when it's worth paying to submit |
| Meta description | Why some literary magazines charge reading fees, when a contest fee is fair, what an "optional" tip jar really is, and how to find magazines that read for free. |
| Primary keyword | literary magazine submission fees |
| Secondary | should I pay submission fees, reading fees literary magazines, submittable tip jar, contest entry fee poetry, free literary magazine submissions |
| Intent | Informational |
| Demand | Not measured. The ranking posts date from 2013–2017. The messaging doc's Bluesky research found hidden tip-jar fees to be a recurring complaint. |
| Audience | Writers and poets |
| Length | 1,300–1,600 words |
| Schema | Article, BreadcrumbList, FAQPage |
| CTA | Browse no-fee magazine calls (`/discover/magazines`, filtered to no fee) |

**Who ranks now.** Funds for Writers ("how to spot a dodgy litmag"); Carve's
"The case for paying writers"; Authors Publish; Erika Dreifus; SleuthSayers.
They're mostly old, and none covers how tip jars appear in today's submission
managers.

**Our angle.** A neutral, current guide: why magazines charge, when a fee is
fair (contests with prizes; a fee that pays contributors), when it isn't, and
what an "optional" tip should look like.

**Questions to answer (H2s):**
- Why do literary magazines charge submission fees?
- Is it normal to pay to submit to a literary magazine?
- When is a contest entry fee fair?
- What's a tip jar, and is it really optional?
- How do I find magazines that read for free?
- How much should I budget for submissions in a year?

**Table.** Columns: fee type · typical amount · what it should get you · fair
when · think twice when. Rows: general submission fee, expedited response fee,
tip jar, contest fee, and a free reading period at a magazine that charges at
other times.

**Missa tie-in.** The no-fee label and "Fee not listed". Keep the fun dial at
zero: this is money.

**Internal links:**
- `/discover/magazines`
- `/discover/no-fee-calls`
- `/discover/free-contests`
- `/discover/chapbook-contests`
- articles 2 and 10

---

### 10. How to spot a scam open call or a vanity gallery

| | |
| --- | --- |
| Slug | `/guides/open-call-scams-vanity-galleries` |
| Title tag | How to Spot an Art Scam Open Call or Vanity Gallery |
| H1 | How to spot a scam open call or a vanity gallery |
| Meta description | Red flags in open calls and gallery invitations, the questions to ask before you pay, and how to check an organizer in ten minutes. |
| Primary keyword | art open call scams |
| Secondary | vanity gallery red flags, is this art competition legit, art exhibition scam email, pay to exhibit gallery, fake art competitions |
| Intent | Informational |
| Demand | Not measured. Several 2023–2026 posts rank, which suggests an ongoing need. |
| Audience | Visual artists and photographers, especially early in their careers |
| Length | 1,300–1,600 words |
| Schema | Article, BreadcrumbList, FAQPage |
| CTA | How Missa checks a call (`/methodology`) |

**Cannibalization check.** `/guides/verify-an-opportunity-before-applying`
already covers checking a call in general. This article covers scams and vanity
galleries specifically, and links to that guide as the checklist. Update the
existing guide to link back.

**Who ranks now.** EntryThingy's "How to spot scam calls for art"; The Abundant
Artist; photoencaustic.com on vanity galleries; Working Class Creatives
Database; Photrio forum threads. Common red flags:
- no clear venue;
- unnamed jurors;
- fees that appear after acceptance;
- most applicants accepted;
- monthly "shows";
- unsolicited invitations;
- "exhibit in NYC" for a fee.

**Our angle.** A ten-minute check anyone can run, set out as a table, plus what
Missa does and doesn't check, so nobody treats a listing as an endorsement. Say
it outright: "If the page doesn't say, neither do we."

**Questions to answer (H2s):**
- How can I tell if an open call is a scam?
- What's a vanity gallery?
- Is an unsolicited invitation to exhibit a red flag?
- Is it ever fine to pay to exhibit?
- How do I check an organizer before I pay?
- What should I do if I've already paid?

**The ten-minute check (table).** Columns: check · where to look · good sign ·
red flag. Rows:
- venue and dates;
- the jurors' names;
- past exhibitions and artists;
- every fee, including after selection;
- the sales commission;
- rights and usage terms;
- insurance;
- what other artists say about it.

**Internal links:**
- `/methodology`
- `/guides/verify-an-opportunity-before-applying`
- `/discover/no-fee-calls`
- articles 2 and 9

---

## Reserve topics

Write these next, or swap them in if keyword research shows one of the ten has
little demand.

| Topic | Primary keyword | Why |
| --- | --- | --- |
| How to track submissions, with a free spreadsheet template | submission tracker spreadsheet | The template's columns match the `/import` CSV, so people who download it can bring it into Missa. Pairs with article 3. |
| Simultaneous submissions: rules and etiquette | simultaneous submissions | Missa stores each magazine's simultaneous policy. Short, high-intent and AI-quotable. |
| How to write an artist statement for an open call | artist statement for open call | Huge demand but crowded. Only worth writing with real examples from residencies and grants. |
| Reading periods: when literary magazines read | literary magazine reading periods | "The magazine that only reads in March" is Missa's own line. Can embed live data. |
| Deadlines and time zones: don't miss by a day | submission deadline time zone | A recurring complaint in the Bluesky research. Missa sends reminders in each person's own time zone. |

## How to measure it

For each article, at 2, 6 and 12 weeks:

| Signal | Where | Good at 12 weeks |
| --- | --- | --- |
| Indexed | Google Search Console URL inspection; Bing Webmaster | Within a week of publishing |
| Impressions and position for the primary keyword | Search Console, Bing Webmaster | Top 20 by week 6, top 10 by week 12 for articles 4, 5 and 8, which already have Bing signal |
| Clicks to `/opportunities`, `/discover/*` and `/signup` | Analytics | Each article sends readers into the catalog |
| AI citation | Ask ChatGPT (search on, in a temporary chat), Perplexity and Google AI Overviews the primary question each month | Missa cited for articles 1, 2 and 4 |
| Referring links | Search Console → Links | At least one roundup or newsletter linking to article 1 |

Write the results into this file under each brief, so the next round of topics
comes from data rather than guesses.
