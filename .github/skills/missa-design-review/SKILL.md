---
name: missa-design-review
description: Reviews a Missa screen against DESIGN.md review criteria and reports findings with severity. Use before a design review, before handoff, or for a second read on a screen.
---

# Missa design review

A screen or a flow is far enough along to be read critically, and you want a
structured first pass before a person spends time on it. The workflow ends at
the review; it does not replace the review itself.

Not for checking design-system compliance. Token names, component usage, raw
colors, radii, and states are mechanical checks against
`apps/web/component-policy.json` and `DESIGN.md`, and they are a different job
from judging whether the screen works. Send those to
`npm run check:design-system` and the `missa-token-mapping` and
`missa-component-docs` skills; do not relitigate them here.

## Output

**Done means.**

Checkable: every finding names the criterion it comes from, nothing in the
report is a preference stated as a finding, and repeated issues appear once with
a count.

Needs a person: accessibility judgements, product decisions, and anything the
criteria did not reach. These are handed over, never settled here.

**Summary.** Three lines: what the screen does, what works, what needs attention
most.

**Findings**, grouped by severity, each with: what you saw, where, which
criterion, and why it matters here.

**Edge cases not covered.** One line each, from `DESIGN.md` section 11 and the
edge-case list in `references/review-criteria.md`.

**For a person to decide.** Anything you stopped on: accessibility judgements,
product decisions, and anything where the criteria did not reach.

**If it stops.** When a required input is missing, hand back three things and
nothing else: which input is missing and why the review cannot run without it,
your one-line reading of what each screen appears to be for so it can be
corrected before it costs a whole review, and the shortest thing that would
unblock it. Do not review anyway and caveat it.

## Inputs

- The screen or flow, as images (REQUIRED)
- What it is for, and who uses it, in a line or two (REQUIRED)
- The review criteria your team has agreed (REQUIRED, and
  `references/review-criteria.md` is the default set until you replace it)
- What has already changed since the last review, if this is a second pass
  (OPTIONAL)
- The constraints the designer was working under: deadline, platform, existing
  patterns (OPTIONAL)

If the purpose is missing, stop and ask. Half of what looks like a problem is a
deliberate choice for a situation you were not told about.

If the screens were described in words rather than supplied as images, stop and
ask for the images. A description reports what the designer noticed; several of
the criteria are judgements about visual weight and about whether size, position
and emphasis agree, and those cannot be read from prose. The edge-case pass
fails the same way: an edge case nobody mentioned is not the same as one that is
not handled.

If no criteria were supplied with the request, use
`references/review-criteria.md` and say in the report that you used it. Do not
invent criteria of your own and present them as the team's.

## Procedure

1. Read `references/review-criteria.md`.
2. Go through the screen once and write, in the summary, what you understand it
   to be asking the user to do. Put it where the reader will see it before the
   findings. Everything after it depends on it being right, so it has to be
   visible enough to be corrected, not held silently.
3. Work through the criteria in order. For each finding, record what you saw,
   which criterion it relates to, and why it matters here rather than in
   general.
4. Give each finding a severity from `references/review-criteria.md`.
5. Separate anything that is a matter of taste from anything that is a matter of
   the criteria. Report the second. Drop the first.
6. List the edge cases the screen does not appear to handle, using the list in
   `references/review-criteria.md`. For each, say whether it is shown or not
   shown, rather than assuming an absence is a mistake.
7. Write the summary last, once you know what the findings are.

## Boundaries

**The Skill may decide.** Fully determined by the supplied criteria and material,
so decide these without asking:

- Whether an observation is supported by a stated criterion
- Which severity a supported finding takes, from the definitions in the
  reference file
- Whether repeated instances are one issue or several
- Whether something is a preference rather than a finding

**Stop and ask.**

- The purpose of the screen was not supplied.
- The screens contradict each other and you cannot tell which is current.
- A finding touches accessibility. Report what you saw and hand the judgement
  to a person. If `DESIGN.md` states the rule, apply it; otherwise do not rule.
- A remedy would change what the product does rather than how it looks. The
  observation still belongs in the findings if a criterion supports it. What the
  product should do instead is the part that goes to a person. Do not drop a
  supported finding because fixing it needs a product decision.
- Anything the criteria do not reach, including whether a deliberate departure
  was right.

**Never.**

- Invent a criterion in order to have something to report.
- Report the same issue once per screen when it is one issue appearing
  repeatedly. Group it.
- Rewrite copy. Flag it and say what is unclear.
- Present a preference as a finding. "I would have used a modal" is not a
  finding.
- Assume a missing state is a mistake. Say it is not shown, and ask.
- Report token or component compliance here; that belongs to the design-system
  check and the other two skills.

## Final checks

- Every finding names the criterion it comes from
- Nothing in the report is a preference stated as a finding
- Repeated issues are grouped into one finding with a count
- Accessibility items are handed over, not ruled on
- The summary was written after the findings, and matches them
