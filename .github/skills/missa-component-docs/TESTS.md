# Tests: missa-component-docs

## Setup under test

- Skill: `SKILL.md`
- Reference files: `references/doc-format.md`
- Project instructions: `AGENTS.md`, `docs/ai-ui-build-directive.md`
- Sources: `DESIGN.md`, `apps/web/component-policy.json`,
  `apps/web/component-catalogue.json`
- Tools connected: none required; `npm run check:design-system` is a local check
- Model: [the one you actually use]

## Which cases apply

| Case | Applies | Why |
| --- | --- | --- |
| Normal | Yes | Always |
| Missing required input | Yes | Usage situations and the variant list are required, and their absence should stop the run |
| Conflicting sources | Yes | Token names and variants commonly arrive from two places (design file vs code vs policy) |
| Tool failure | No | This workflow uses no external tool |
| Ambiguous judgement | No | It records supplied material rather than evaluating it |

## Done means

- Every documented detail is supported by the supplied sources
- The entry follows the field order in the format file
- Anything missing or unresolved is listed rather than filled in
- Needs a person: items marked `NEEDS REVIEW`, and everything under **Guessed at**

## Baseline

Run it with no setup: the component material, and "write the spec for this
component".

| Case | What happened with no setup |
| --- | --- |
| Normal | [record it] |

Watch for these in the baseline: its own invented field order, no
`do_not_use_when`, states described by colour, a token name not in the source,
and usage examples that sound plausible and are not real.

## Normal case

**Input:** a component with variants, parts, tokens, behaviour notes and two
real usage situations, all pointing at real Missa sources.
**Expect:** the full field order; token list matching the source exactly; both
usage situations traceable; states describing behaviour; a catalogue/policy
update proposed where the spec records a change.
**Fails if:** a token name appears that is not in the input, a state is
described by colour, a field is added, or a `status: approved` is claimed
without a shipped screen or documented decision.

## Missing required input

**Input:** the same component with no usage situations supplied.
**Expect:** it stops and asks for them.
**Fails if:** it writes the entry anyway, however good the examples look. This
is the case that fails invisibly, because invented usage examples read exactly
like real ones.

**Worth a second run** with the variant list removed instead. The two gaps sit
in different rows of the same table, and a skill can hold on one and leak on the
other.

## Conflicting sources

**Input:** token names supplied twice, from the design library and from an older
spreadsheet, with different names for the same tokens.

**Is there an applicable precedence rule?** Yes, in `.github/skills/README.md`
(`DESIGN.md` then `component-policy.json` then the catalogue then the source).

**Expect, with the rule loaded:** it follows the rule, says that it did and why,
and records the discrepancy under **Guessed at** rather than dropping it.

**Expect, with no applicable rule:** it reports both sets, names the source of
each, and does not choose.

**Fails if:** it mixes the two, or resolves the conflict without mentioning it.

Run this once with the project instructions loaded and once without. Matching
results mean the rule is not doing the work.

## Tool failure

Not applicable. This workflow uses no external tool.

## Ambiguous judgement

Not applicable. This workflow records what was supplied rather than evaluating
it. Judgement calls it does make are already declared under **Guessed at**, and
the normal case checks that list.

## Record

| Date | Case | What happened | What changed after |
| --- | --- | --- | --- |
|  |  |  |  |

Change one thing at a time.
