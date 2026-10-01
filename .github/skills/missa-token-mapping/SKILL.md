---
name: missa-token-mapping
description: Maps existing values or legacy styles onto Missa's canonical tokens (color roles, spacing, type, radius, motion) and reports gaps. Use before handoff, auditing a screen, or checking design-system fit.
---

# Missa token mapping

Existing values or legacy styles need mapping onto the Missa token set: before
handoff, during an audit, or when checking whether a screen fits the system
without changing it.

The workflow ends at the mapping table. Deciding what the system should contain
is a separate job: this one reports gaps, it does not fill them.

## Output

**Done means.**

Checkable: every mapped value points to a token that exists in the supplied or
retrieved source, semantic fit was checked rather than value similarity alone,
ambiguous mappings are visible rather than resolved, and gaps stay gaps with no
invented names.

Needs a person: which gaps become new tokens and what they are called, how each
ambiguous case is settled, and any source conflict no precedence rule reaches.

**Summary.** Counts per classification: exact, semantic, ambiguous, gap.

**Mapping table.** Value, what it is doing, proposed token, classification, and
the reason in one line.

**Do not use.** Any value whose number matches a token exactly while that
token's purpose does not fit. Name the token and say it must not be used here.
This is the single most copyable mistake the report can prevent, and it
disappears if it is left inside a reason column.

**Ambiguous.** Each case with every candidate and what would settle it.

**Gaps.** Each value, what it is doing, and why no token covers it.

**For a person to decide.** Ambiguous cases and gaps, plus any unresolved source
conflict.

**Source.** Which token list was used, where it came from, and when it was read.
Say whether you read it with a tool or were given it. A pasted list is only as
current as the paste.

**If it stops.** When there is no token list, or the gap threshold is crossed,
say which of the two stopped it, hand back the work already done that does not
depend on the token list, and name the shortest thing that would unblock it.
Step 3 does not need the token list, so run it and show it: a refusal with the
groundwork attached is worth more than a bare one.

## Inputs

- The values or styles to map (REQUIRED)
- The canonical token list, with names, values and what each token is for
  (REQUIRED, unless a tool can read it). The third part is what makes the run
  possible: without stated purpose you can only match on numbers, which is where
  the confident wrong answers come from
- Where a tool should read it: `DESIGN.md`, `apps/web/app/globals.css`, or an
  export (REQUIRED when no list is pasted). A tool appearing in your tool list
  is not the same as one that can reach the file
- Which source the token list came from (REQUIRED)
- What each value belongs to: which component, which part (OPTIONAL, and it is
  what makes semantic fit decidable rather than guessed)
- The surface family the screen belongs to, for density-mode resolution
  (OPTIONAL; defaults to the `DESIGN.md` surface-family table)
- Your own tolerances and categories, if they differ from
  `references/mapping-rules.md` (OPTIONAL)

If no canonical token list was supplied and no tool is connected, stop. Mapping
against remembered token names is how wrong names enter a handoff.

## Procedure

1. Read `references/mapping-rules.md` for the categories, the tolerances per
   category, the gap threshold and the report shape.
2. Get the token list: from what was supplied, or by reading `DESIGN.md`,
   `apps/web/app/globals.css`, and `apps/web/component-policy.json`. Say which
   you used, and when it was read.
3. For each value, say what it is doing: the part it belongs to and the job it
   performs there. This is what the rest of the run depends on.
4. Find the candidate tokens whose stated purpose could cover that job. Look at
   purpose first, value second.
5. Classify the result as exact match, semantic match, ambiguous, or gap, using
   the definitions in the reference file.
6. For an ambiguous result, name every candidate and what would settle it. Do
   not pick one.
7. For a gap, say what the value is doing and why no token covers it. Do not
   propose a name.
8. Write the summary counts last, from the classified list.

## Boundaries

**The Skill may decide.** Fully determined by the supplied material, so decide
these without asking:

- Whether a value equals a token's value
- Whether a candidate token's stated purpose fits what the value is doing
- Whether a difference falls inside the stated tolerance
- Which classification a result belongs to

**Stop and ask.**

- No canonical token list is available and no tool is connected.
- The token list has two entries with the same name and different values. That
  is a broken list, not a conflict to resolve; stop.
- Two sources give different names or values for the same token. Follow the
  source precedence in `.github/skills/README.md` if one applies, and say that
  you did. If none applies, report both and do not choose.
- More of the values are gaps than the threshold in
  `references/mapping-rules.md` allows. Past that point it is not a mapping
  problem, and continuing produces a report nobody can act on. Say so and ask
  whether the right token set was supplied.
- Whether a gap should become a new token, and what it would be called. New
  tokens are a `DESIGN.md` decision, never a mapping decision.

**Never.**

- Invent a token name, or propose one as though it existed.
- Resolve an ambiguous case to make the table complete.
- Match on value alone when the token's purpose does not fit what the value is
  doing.
- Round a value to make it match. A difference inside tolerance is stated, not
  erased.
- Map a spacing value off the 8px density ladder as though it were a token.
- Present values read by a tool as current without saying when they were read.

## Final checks

- Every token name in the report exists in the supplied or retrieved list
- Every row states the reason, not just the classification
- No ambiguous case was resolved to make the table complete
- No name is proposed for a gap
- No raw color, font family, arbitrary radius, or off-scale spacing is reported
  as a token match
- The source line names the list and when it was read
