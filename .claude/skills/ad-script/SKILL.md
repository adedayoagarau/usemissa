---
name: ad-script
description: Write voiceover scripts for Missa launch films, product announcements, ads and social cutdowns that sound like a person talking to a person, not a product describing itself. Use when asked to write, rewrite or critique a video script, voiceover, ad, announcement film, promo, trailer, or 30s/15s/6s spot, or when a draft reads "robotic", "tech-led", "AI to AI", "slop" or like a feature list. Covers the brief and word budget, fact-checking claims against the codebase, finding the human truth, studying real commercial scripts, drafting options on named moves, the reject pass, presenting options, and handing a chosen script to voice, storyboard and cutdowns.
user-invocable: true
argument-hint: "[what is launching] [length] [audience]"
---

# Ad script

A process for scripts people want to hear twice. It was built on the Missa launch film
(`video/launch`), where three rounds of feature-led drafts were rejected before
**"Talent's your department"** landed. The case study is in
`references/missa-launch-case.md`. Read it once before you write. It shows the
failure modes this process exists to avoid.

The test for every line: **would a person say this out loud to a friend?**
Product copy can be accurate and still fail that test. "Compare the facts. Open the
official source." is correct UI copy and a dead ad.

## 1. Brief and budget

Pin these down before you write anything. Use sensible defaults and say what you
assumed. Don't stall on questions.

- **What is launching**, in one sentence a creator would understand.
- **Who it's for.** Name the person, not the segment.
- **The one thing they should remember.** Only one.
- **CTA and end line.** Use the end line in `docs/missa-messaging.md` (currently
  "Missa. Find the call. Make the deadline."). Don't invent a new tagline per film.
  That guide also sets the voice, the fun dial and the words to avoid.
- **Length.** Speech runs about 2.2–2.5 words a second with room for pauses:

  | Length | Words |
  | --- | --- |
  | 6s | 10–14 |
  | 15s | 30–36 |
  | 30s | 65–75 |
  | 45s | 95–110 |
  | 60s | 130–150 |

  Leave about 3 seconds at the end for the end card. Slower voices take more room:
  the launch script ran 27s with one voice and 29.5s with another.

## 2. Facts before words

Every product claim must be something Missa does **today**. Check the code and
docs, not memory:

- Search the routes, components and docs for the feature (`apps/web`, `packages/*`,
  `docs/`). Record the file path behind each claim you plan to make.
- Collect the product's **own language**: real reminder offsets ("Two weeks
  before", "A week before", "The day before"), real statuses, real headings. Real
  wording on screen beats invented wording.
- List what is **not shipped** (for example SMS or WhatsApp reminders) and keep it
  out of the script and the pictures.
- Note numbers you could use (counts, sources, cadence). Only use them if a
  source in the repo states them.

Write the fact sheet down. You will quote it back when you present the scripts.

## 3. Find the human truth

Ads that work start from something the viewer already feels, not from what the
product does. Write 5–10 candidate truths about the audience's actual problem, then
pick the most specific one. For Missa's launch the brief was "lead with why many
artists have not made progress": they never hear about the opportunity, they hear
too late, or they save it and the deadline slips past.

Good truths are concrete and slightly uncomfortable: "That magazine that only reads
submissions in March. Miss one, and you wait a year." Bad truths are categories:
"creators face many challenges".

## 4. Study real scripts before drafting

Read 30–50 real commercial scripts in the right register before your first draft.
This is the step that turned the launch film around. Edge Studio's free script
library is a good, broad source (it covers Technology, Luxury, Non profit,
Education, PSA and Promos). Fetch it with `scripts/fetch_edge_scripts.py`; the site
sits behind a JavaScript cookie challenge that the script solves.

Most of the library is amateur. Skim for the few scripts that make a clear move,
and write down the move, not the words. `references/script-moves.md` holds the
moves we found, with examples and notes on when each fits.

## 5. Draft options, one move each

Write **3–4 scripts**. Build each on a different named move from
`references/script-moves.md`: wry confident opener with a turn, first person,
named character, sustained metaphor, countdown. Options that share a structure
aren't options.

For each draft:

- Open on the human truth, inside the first five words if you can.
- Give every line one idea. Short lines, spoken rhythm, fragments allowed.
- Be specific: a month, a city, a number, a named thing.
- Put the product in **one** sentence, in plain verbs a creator would use ("finds",
  "reminds you"). It arrives after the problem, never before.
- End on a payoff that calls back to the opener ("Talent's your department.
  Deadlines are ours." answers "the art world runs on talent").
- Then the brand close.

## 6. Reject pass

Read each draft aloud, then cut anything on this list. Each item caused a rejection
on the launch film.

- **Feature lists and UI verbs.** "Compare the facts. Open the official source. Save
  your decision. Track what comes next." These are buttons, not a story.
- **Robotic structure.** Numbered beats, "01 / 04" counters, and a list of
  disciplines read like a roll call.
- **Investor language.** "The opportunity layer", "platform", "ecosystem",
  "infrastructure". An artist would never say them.
- **Missa's rejected patterns** (`docs/missa-content-quick-reference.md`):
  "Whether you're…", "No X. Just Y.", "Less X. More Y.", "From X to Y.", "At
  Missa, we believe…", three abstract benefits written for rhythm, endings about
  "what matters most", and banned words such as seamless, effortless, unlock,
  elevate, journey, powerful, simply and all in one place.
- **AI-to-AI tone.** Balanced triplets, tidy parallelism with no edge, sentences
  that explain the joke, feelings stated rather than shown ("frustrating",
  "overwhelming").
- **Claims the fact sheet doesn't support**, and anything not shipped.
- **No AI in the marketing.** Don't sell Missa as AI.

Then count the words against the budget.

## 7. Present

Show the options in full, each with:

- a name in quotes and the move it uses (*wry opener, after Beringer*);
- the script, one line per beat;
- for the recommended one, a line on why it fits this brief.

After the options, add:

- **Facts:** one line confirming every claim is shipped, citing the fact sheet.
- **Voice:** which kind of voice each script needs. Dry wit needs restraint, not
  polish. First person needs a voice that sounds like a real artist, not a
  narrator.

Then stop and let the person choose. Take line edits as given. Don't defend a
line
they've cut.

## 8. After a script is chosen

- **Delivery.** For ElevenLabs v4, add sparse audio tags only where the turn
  needs them (`[dry]`, `[short pause]`, `[knowingly]`, `[softly]`, `[warmly]`,
  `[confident]`). Record 4 takes. Choose by pacing and listen for tags spoken
  aloud.
- **Storyboard.** Make a table that pairs each line with one picture. The picture
  should act the line out, not caption it ("Talent helps." makes the word shrink
  to a footnote).
- **Cutdowns.** The 15s keeps hook → product → payoff → close. The 6s keeps hook →
  close. Choose them now, so the long version has clean cut points.
- **Captions.** Burn them in for muted autoplay, but skip any line already on
  screen as big type.

The production pipeline (Remotion, voice sync, sound design, score and mastering)
is documented in `video/launch/README.md`.
