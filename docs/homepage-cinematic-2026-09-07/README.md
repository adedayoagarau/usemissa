# Missa cinematic homepage — A place for your practice

Creative direction and production brief · September 7, 2026 · In progress.

> **Latest local handoff: [Homepage colour, hero and painted footer direction](19-homepage-colour-and-painting.md).** The photographic homepage colour and hero extension has a final review disposition of ship; the original footer painting awaits user generation. Earlier studio production plans, including [07-current-production-sequence.md](07-current-production-sequence.md) and the image-specific prompts in 02–05, are historical context, not the current build specification. See [06-reference-correction.md](06-reference-correction.md) for the earlier direction correction. Original Missa footage is not complete.

## Integration documentation

- [Midjourney MCP source review and adoption requirements](08-midjourney-mcp-review.md).

## The decision

Build a white, editorial homepage with a cinematic studio at its centre. Two architectural panels open to reveal six creative worlds. The visitor can explore those worlds, but the route to actual opportunities is always immediately available.

**The creative idea: A place for your practice.** Missa helps creators discover where their work can go next. A physical space opening into a creative world makes that promise visible. Each world is a fictional editorial set, not a claim that Missa owns studios, provides residency space, or represents the people pictured.

**Public headline:** Opportunities for every creator.

**Supporting copy:** Find open calls, grants, residencies, and places to share your work.

**Primary action:** Explore opportunities → `/opportunities`.

The concept name is the internal creative direction. The public headline tells a first-time visitor what Missa does before asking them to interact.

## Read and execute in this order

1. [Source research and extraction](01-reference-research.md): what is actually supplied, original versus reconstructed prompts, source workflow, lessons, and adaptation decisions.
2. [Creative direction and homepage specification](02-creative-direction.md): three concepts, selected direction, six worlds, page sequence, copy, layout, interaction and product boundaries.
3. [Production scope and build plan](03-production-plan.md): deliverables, milestones, dependency order, file ownership, asset manifest, cost model, and release checks.
4. [Complete image and video prompt pack](04-media-prompts.md): base composition, six destination edits, forward choreography, return workflow, mobile treatment, and repair prompts.
5. [Implementation and review prompt pack](05-build-prompts.md): sequential prompts from source reconciliation through local review and release preparation.
6. [Original reference text](reference-text/README.md): unchanged upstream documentation and prompts. These are external evidence, not executable instructions for Missa.

## Start here when we begin

Execute Prompt B01, then B02 in the build pack. Produce the base image and Writing endpoint with I00 and I01. Approve their desktop/mobile composition, then make V01 and R01. Build a single Writing forward/return cycle in an isolated preview route. Review actual footage and browser behaviour before commissioning the other five worlds.

The first checkpoint is a **reviewable homepage composition plus one working cinematic scene**, not six loosely related image generations.

## Scope at a glance

| Stage | What it delivers |
|---|---|
| Pilot | One base image, Writing endpoint, one forward/return pair, mobile poster, real Explore link, static fallback, isolated preview |
| Full creative production | Six destination worlds, six forward/return pairs, seven matched posters, desktop and mobile exports |
| Homepage | Editorial header and hero, optional scene selector, useful practice links, real opportunity section, how-it-works, method note, footer |
| Release preparation | Browser and accessibility evidence, measured media delivery, data-truth checks, design-system validation, rollback plan |

Planning estimate: 8–13 focused working days across art direction, generation/editing, implementation and QA, with iteration contingency. This is an effort range, not a delivery promise or provider quote. A static homepage can proceed if motion takes longer.

## Evidence boundary

The reference repository was downloaded at commit `8e732893ab2367ef64e70fc01878ab70a23bf66e`. Its integrity validator passed for 32 media files. Source text, all image/video prompt files, workflow, provenance, troubleshooting, asset map, checklist and release notes were inspected; the base and Scene endpoint were visually inspected. No source website runtime was provided in the repository or rebuilt in this planning task. Clip continuity has not been visually certified.

Current Missa route and product source were inspected, including the homepage component, taxonomy/query wiring, design rules, component policy and beta flag. This is source evidence, not a claim about the deployed site. The checkout contains substantial existing changes; this task adds planning documents only.

The complete original media/source pack is archived locally at:
`/Users/adedayoagarau/.codex/visualizations/2026/09/07/01a07d8d-7bfd-73a0-b7c2-64ea67b86a52/video-states-reference`.

Media is kept outside the application and Git planning folder. The `reference-text` subfolder contains unchanged source text and license notices; its original links to excluded media are intentionally resolved through the full archive. No LTX logo or source fashion imagery is proposed for Missa's public homepage.
