# Missa mapping rules

## Contents

- Classifications
- Categories
- Tolerances
- Gap threshold
- What counts as a source conflict
- Report shape

These rules reflect Missa's token architecture in `DESIGN.md` and
`apps/web/app/globals.css`. The classifications and the order of checks are the
part that holds; the categories and tolerances below are Missa's current set.

## Classifications

Every value ends in exactly one of these. Purpose is checked before value, in
every case.

**Exact match.** A token exists whose stated purpose covers what the value is
doing, and the value is identical.

**Semantic match.** A token exists whose stated purpose covers what the value is
doing, and the value differs by less than the tolerance for its category. State
the difference; do not round it away.

**Ambiguous.** More than one token could fit, and nothing in the supplied rules
separates them. Or the value's purpose cannot be determined from what was
supplied, so fit cannot be judged. Name every candidate and what would settle
it.

**Gap.** No token's purpose covers what the value is doing, whatever the
numbers look like.

A value that matches a token's number but not its purpose is not a match.
Depending on what is known, it is ambiguous or a gap. This is the rule that
prevents the most confident wrong answers, because numbers coincide across a
system constantly.

## Categories

Purpose is expressed through categories. A candidate token only counts if it
sits in the category the value's job belongs to.

- **Color role.** One of the ten allowed roles in `component-policy.json`:
  canvas, surface, ink, primary, success, warning, destructive, information,
  border, focus. The scoped palette tokens (Forest, Green, Amber/ochre, Red,
  Mineral blue, Lichen) map onto these roles; they are not a separate category.
- **Spacing.** Inset, Stack, Inline, or Gap. Two different jobs on one scale, so
  record which one a value is doing. Spacing resolves against the density ladder
  for the surface family.
- **Size.** Fixed widths and heights, including the 44px hit target.
- **Radius.** 4, 8, 12, 16, or full.
- **Border width.** Hairline or the specified border tokens.
- **Type.** Size, weight, line height, tracking, and family (Newsreader,
  Instrument Sans, Fragment Mono).
- **Elevation.** Subtle shadow or overlay shadow.
- **Motion.** Duration and easing; 120ms hover/press, 180ms small disclosure,
  280ms dialog/sheet.

If a value's category cannot be determined, that is ambiguous, not a guess.

## Tolerances

How much the raw value may differ once semantic fit is confirmed.

Tolerance is never what makes a match semantic. Purpose decides that first; the
tolerance only says whether a value that already belongs to the right token is
close enough to count as a match, or far enough to need a person.

- Color: none. A near miss is not a match, however close the hex.
- Spacing: a value must equal an existing `--space-*` token or a value on the
  density ladder (8/12/16/24/32/48/64/96 by mode). A value off the ladder is
  ambiguous (the token is right and the value is wrong) or a gap (a fixed
  height no category covers). Do not round onto the ladder.
- Size: 2px or less.
- Radius: must equal 4, 8, 12, 16, or full. No tolerance; an arbitrary radius is
  a forbidden value.
- Border width: 1px or less.
- Type size: 1px or less against the type scale table.
- Line height: 0.1 or less, measured as a ratio of line height to font size.
- Motion duration: 50ms or less against 120, 180, or 280ms.

A difference exactly equal to the number above is inside tolerance. Design
values cluster at round distances, so this boundary is where real values land
rather than an edge case.

A value outside tolerance whose purpose still fits a token is ambiguous rather
than a gap: the token is right and the value is wrong, and someone has to decide
which of the two moves.

## Gap threshold

If more than about a third of the rows are gaps, stop and say so. Past that
point the report is not actionable and the likelier explanation is that the
wrong token set was supplied.

Count rows, not values. A compound value carries more than one property and
becomes more than one row: `1px solid #E3E3E3` is a border color and a border
width, and one row cannot hold two classifications. Split every compound value
before counting.

Below about ten rows the threshold is noise. Under that, report the gaps and say
the run was too small to judge coverage.

The stop can only fire once everything is classified, since the count is the
last thing you learn. Deliver the finished table, flag it as unactionable, and
ask the question. Do not bin the work.

## What counts as a source conflict

Two sources give a different value for the same token name, or a different name
for the same value.

Follow the source precedence in `.github/skills/README.md` if one applies, and
say that you applied it. If none applies, report both sources and do not choose.

A token list containing two entries with the same name and different values is
not a conflict to resolve. It is a broken list, and it stops the work.

## Report shape

```markdown
## Summary
Exact: 34 · Semantic: 6 · Ambiguous: 3 · Gap: 4

## Mapping
| Value | What it is doing | Token | Class | Reason |
| --- | --- | --- | --- | --- |
| Forest | Primary button surface | color.primary | Exact | Purpose and value both match |
| 15px | Link label | type.body | Semantic | Purpose matches, 1px smaller, inside tolerance |

## Ambiguous
- 12px, gap between stacked labels in a compact table cell. Candidates: the
  Compact row value (8px) and Comfortable row value (12px). The surface family
  was not supplied, so the mode cannot be resolved.

## Do not use
- Green for a "Submitted" tracker state. Green means verified or completed;
  Submitted is a neutral process state. Using Green here would wrongly signal
  success.

## Gaps
- 44px, invoice table row height. A fixed component height. The spacing scale
  governs padding and gaps; no token category covers fixed heights.

## For a person to decide
The ambiguous cases above, and whether row height should become a token at all.

## Source
Token list read from DESIGN.md and apps/web/app/globals.css on 2026-09-30.
```
