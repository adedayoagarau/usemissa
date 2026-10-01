# Tests: missa-token-mapping

## Setup under test

- Skill: `SKILL.md`
- Reference files: `references/mapping-rules.md`
- Project instructions: `AGENTS.md`, `docs/ai-ui-build-directive.md`
- Sources: `DESIGN.md`, `apps/web/app/globals.css`,
  `apps/web/component-policy.json`
- Tools connected: [none, or a design tool if you are using the tool path]
- Model: [the one you actually use]

This is the one setup where the tools line changes the answer. A run with a
connected tool and a run with a pasted list are two different tests.

## Which cases apply

| Case | Applies | Why |
| --- | --- | --- |
| Normal | Yes | Always |
| Missing required input | Yes | The canonical token list is required, and its absence must stop the run |
| Conflicting sources | Yes | Token names commonly arrive from more than one place |
| Tool failure | Only on the tool path | Skip it entirely if you paste the list |
| Ambiguous judgement | Yes | Ambiguous is a first-class result here, and collapsing it is the main failure |

## Done means

- Every mapped value points to a token that exists in the supplied or retrieved
  source
- Semantic fit was checked, not just value similarity
- Ambiguous mappings are visible rather than resolved
- Gaps stay gaps, with no invented names
- Needs a person: which gaps become tokens, and how each ambiguous case is
  settled

## Baseline

Run it with no setup: the values, the token list, and "map these to our tokens".

| Case | What happened with no setup |
| --- | --- |
| Normal | [record it] |

Watch for these in the baseline: a value matched to a token with the same number
but the wrong purpose, an ambiguous case quietly resolved, a plausible token
name that is not in the list, an off-ladder spacing value rounded onto the
scale, and a proposed name for a value that has none.

## Normal case

**Input:** a screen's values, each with what it is doing, plus a token list
naming its source.
**Expect:** four classified groups with counts, a reason on every row, and a
source line.
**Fails if:** a value is classified on its number alone, a token name appears
that is not in the list, or a raw color or off-scale spacing is reported as a
match.

## Missing required input

**Input:** the values, with no token list and no tool connected.
**Expect:** it stops and asks for the list.
**Fails if:** it maps against remembered or plausible token names. This is the
failure that reaches a handoff, because the names look right.

## Conflicting sources

**Input:** two token lists naming the same tokens differently.

**Is there an applicable precedence rule?** Yes, in `.github/skills/README.md`.

**Expect, with the rule loaded:** it follows the rule, says so, and still
reports the conflict rather than quietly dropping the other source.

**Expect, with no applicable rule:** it reports both and does not choose.

**Fails if:** it mixes names from the two lists, or resolves the conflict
without mentioning it.

## Tool failure

Only on the tool path.

**Input:** the normal case, run while the tool is unavailable, lacks permission,
or returns only part of the token list.

**Expect:** it says the list is incomplete or unavailable, maps only what it can
verify against what came back, and marks the rest as unverified rather than
falling back on what it remembers.

**Fails if:** it produces a full-looking report from a partial list, or does not
say the list came back incomplete.

## Ambiguous judgement

**Input:** three values that should not resolve cleanly. One sitting between two
tokens of the same category. One whose purpose was not supplied, so fit cannot
be judged. One where the number matches a token in a different category.

**Expect:** all three appear as ambiguous or gap, each naming every candidate
and what would settle it. The last one is not reported as a match.

**Fails if:** any of the three is given a single confident token, or the
cross-category number match is accepted.

## Record

| Date | Case | What happened | What changed after |
| --- | --- | --- | --- |
|  |  |  |  |

Change one thing at a time.
