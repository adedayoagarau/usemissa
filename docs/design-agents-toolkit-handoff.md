# Design Agents Toolkit — application to Missa

This documents how the
[Design Agents Toolkit](https://designsystems.surf) 30-prompt library maps onto
Missa's existing design-system work, and where each prompt can improve it. It is
the maintenance companion to the three adapted skills under
`.github/skills/` (`missa-component-docs`, `missa-token-mapping`,
`missa-design-review`).

The six prompt stages are `Define`, `Architect`, `Connect`, `Build`, `Test`, and
`Improve`, five prompts each.

## What the prompts are for

These prompts build and maintain a *skill*, not a one-off fix. In Missa the
skills they produce are the three under `.github/skills/`. The prompts are most
valuable when a workflow changes, a skill stops behaving, or accumulated
material has drifted from the canonical contracts.

## Mapping to earlier works

### Define — decide what is worth a skill

| Prompt | Earlier work it applies to | Concrete use |
| --- | --- | --- |
| Define 1 — Find the job worth building | The repeatable design jobs scattered across `docs/` | Decide which Missa workflows deserve a skill beyond the three built: `design-qa.md`, the `*-contract` + `*-visual-directions` pairs, and the content style guide are all candidates. |
| Define 2 — Set the job boundaries | `component-policy.json` `boundary` fields | Re-derive boundaries as stop conditions, not prose. Several `boundary` strings ("an official-destination click is intent, not submission") already read as boundaries. |
| Define 3 — Define what done means | `docs/ai-ui-build-directive.md` Handoff section | Tighten "done" into checkable conditions versus human review, matching the directive's handoff evidence list. |
| Define 4 — Record the baseline | `design-qa.md`, `missa-overhaul-coverage-audit-2026-08-08.md` | Capture the no-skill baseline so the `missa-design-review` skill's value is measurable. |
| Define 5 — Decide what stays a prompt | The `docs/prompts/` folder and ad hoc UI prompts | Split recurring workflows (skill) from one-off asks (prompt). |

### Architect — place context in the right layer

| Prompt | Earlier work it applies to | Concrete use |
| --- | --- | --- |
| Architect 1 — Sort material into the right place | Overlapping rules in `AGENTS.md`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`, `docs/ai-ui-build-directive.md` | Decide which rules are shared, which are skill-specific, and which belong in a reference file rather than restated four times. |
| Architect 2 — Build the source map | Token truth split across `DESIGN.md`, `component-policy.json`, `component-catalogue.json`, `globals.css`, `collection-palette.css`, `creator-palette.css` | Produce one source-precedence map and record the known stale copy (the token spreadsheet noted in earlier work) as a retired source. |
| Architect 3 — Find missing context | `docs/ai-ui-build-directive.md` required-context list | Identify rules the directive assumes but does not point at, so the three skills stop guessing. |
| Architect 4 — Trim persistent context | `design-qa.md` (77KB), `missa-premium-component-selections` (101KB), `missa-strategy.md` (298KB) | Keep only the material that changes a workflow's result; move the rest to reference files or delete. |
| Architect 5 — Define per-run inputs | `missa-design-review/SKILL.md` Inputs | Confirm which inputs are required versus optional, and what a missing one does. |

### Connect — tools, access, and approval

| Prompt | Earlier work it applies to | Concrete use |
| --- | --- | --- |
| Connect 1 — Decide whether tools are needed | `scripts/check-design-system.mjs` | State the minimum capability the design-system check needs to remain the mechanical layer. |
| Connect 2 — Check actual access | The Shadcn Studio catalogue count in `check-design-system.mjs` | Separate observed catalogue availability from installed components, as the script already notes. |
| Connect 3 — Define what the tool must do | `missa-token-mapping` tool path | Contract the token-list read (which file, when, read-only) so the pasted path and tool path stay equivalent. |
| Connect 4 — Set approval points | Publishing and destructive UI actions | Encode the "human checkpoint before publish" boundary the toolkit flags as hard to take back. |
| Connect 5 — Limit tool access | `.github/skills/impeccable/scripts/detector/` | Keep each skill's access to read-only source reads plus the design-system check; no write outside its own spec/catalogue update. |

### Build — create and tighten the skills

| Prompt | Earlier work it applies to | Concrete use |
| --- | --- | --- |
| Build 1 — Build the skill | The three skills already built | Re-run to replace any remaining bracketed or placeholder fields after first real use. |
| Build 2 — Write the description | `missa-*` `description` frontmatter | Verify each description matches the language a Missa request actually uses and excludes nearby jobs. |
| Build 3 — Make the procedure explicit | `missa-component-docs` Procedure | Replace any "review" or "consider" wording with checkable actions. |
| Build 4 — Sharpen the output contract | `missa-component-docs/references/doc-format.md` | Confirm the output contract against a real published spec. |
| Build 5 — Write project instructions | `AGENTS.md` and the three skills | Move shared rules into `AGENTS.md` and remove duplicated lines from individual skills. |

### Test — verify against real risks

| Prompt | Earlier work it applies to | Concrete use |
| --- | --- | --- |
| Test 1 — Build the right test cases | Each `TESTS.md` | Confirm each case matches the workflow's actual risks; drop invented edge cases. |
| Test 2 — Run the missing-input case | `missa-component-docs` usage situations | Verify it stops without two real usage situations, the case that fails invisibly. |
| Test 3 — Test conflicting sources | The token spreadsheet vs `DESIGN.md` | Verify `missa-token-mapping` follows the precedence rule rather than silently mixing. |
| Test 4 — Compare against the baseline | `design-qa.md` and `/design-system/*` reviews | Run the `missa-design-review` skill on a screen already reviewed manually and diff the findings. |
| Test 5 — Test the decision boundary | `component-policy.json` `boundary` strings | Verify the skills hand product decisions to a person instead of settling them. |

### Improve — fix what drifted

| Prompt | Earlier work it applies to | Concrete use |
| --- | --- | --- |
| Improve 1 — Cut what is not earning its place | The four restated rule sets | Reduce duplicated instructions across `AGENTS.md`, `.cursor`, `.github/copilot-instructions.md`, and the directive. |
| Improve 2 — Stop invented content | `component-policy.json` "Never invent a token name" rules | After a real failure, classify whether the gap was an input, rule, boundary, or stop condition, then make the smallest change. |
| Improve 3 — Fix a skill that does not trigger | `missa-*` descriptions | Rewrite the description against real Missa request language and a nearby request it should not catch. |
| Improve 4 — Repair a failed test | Any failing `TESTS.md` row | Make one targeted change and confirm the affected test. |
| Improve 5 — Update when the workflow changes | `DESIGN.md` open decisions | When an open decision resolves (e.g., final Forest strength), update only the affected skill sections and list the tests to rerun. |

## Run these first

1. **Architect 2 (source map)** — the highest-leverage fix. A single source
   precedence map removes the recurring "which token wins" ambiguity that the
   token spreadsheet and multiple CSS palettes create.
2. **Build 5 + Architect 1 + Improve 1 (project instructions)** — consolidate the
   four overlapping rule sets so the skills and the directive stop repeating the
   same rules.
3. **Define 4 + Test 4 (baseline)** — record a no-skill baseline for one
   `/design-system/*` screen, then compare `missa-design-review` against it so
   the skill's value is measurable rather than assumed.
4. **Test 2 (missing input)** — the invisible-failure case on
   `missa-component-docs`, run first because invented usage examples are the
   part readers copy.

## When not to use the prompts

The prompts build and tune skills. Do not run them for a one-off UI fix, a
copy tweak, or anything a sentence-long prompt already handles. If a rule
belongs to one workflow only, leave it in that skill; if it applies across
workflows, it belongs in `AGENTS.md` and the shared source map, not duplicated
in every skill.
