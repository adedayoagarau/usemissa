# Missa review criteria

## Contents

- Severity
- The criteria
- Edge cases to check
- What not to report

These criteria come from `DESIGN.md`. The structure is what matters: named
criteria, defined severity, and an explicit list of what is out of scope.

## Severity

**Blocking.** A user cannot complete the task, or would reasonably lose data or
make an error they cannot undo.

**Should fix.** The task can be completed, but with avoidable confusion, extra
steps, or a real chance of the wrong outcome.

**Note.** A smaller inconsistency, or something worth deciding before it spreads
to other screens.

If you cannot decide between two levels, choose the lower one and say why in one
line.

## The criteria

**1. The task is obvious.** Someone arriving at this screen can tell what they
are being asked to do and what will happen next.

**2. One primary action.** The main thing to do is visually dominant, and
competing actions do not look equally weighted. A normal Missa view has at most
one Forest-filled primary action (`DESIGN.md` color rule 1).

**3. Hierarchy matches importance.** What matters most reads first. Size, weight
and position agree with each other rather than competing. Headings are short and
direct; hierarchy comes from spacing, type, and hairline borders, not gradients
or oversized type.

**4. Grouping reflects relationships.** Things that belong together are
together, and proximity is not doing the opposite of what the content implies.
Internal space is tighter than external, and between-group space is at least
twice within-group space (`DESIGN.md` spacing laws).

**5. Labels say what will happen.** Buttons and links describe the outcome, not
the mechanism. Nothing depends on a tooltip to be understandable. Use customer
language, not backend enums.

**6. The user can tell where they are.** Position in a flow, in a list, or in a
process is visible without counting. Active navigation uses Forest text, icon,
or a restrained indicator, not a large colored capsule.

**7. Recovery is possible.** Anything destructive is confirmable or reversible,
and the user can get back to where they were. Declined, withdrawn, archived, and
closed are neutral states, not failure alerts.

**8. Consistency with the rest of the product.** The screen behaves the way its
neighbours behave, and departures from that are deliberate. It uses the density
mode of its surface family and the typography role of its content, not the route
it sits on.

**9. Content holds up at its extremes.** The design still works with the longest
realistic content and with the shortest. Empty, loading, and error states have
specific explanations and a useful next action; no generic "No data".

**10. Motion explains, never decorates.** Any animation passes the four gates in
`DESIGN.md` section 9: state is changing, motion improves comprehension, motion
stops with the state, and text or accessible state gives an equivalent. Deadlines,
fees, eligibility, verification, match scores, and premium labels never animate.

## Edge cases to check

Empty, loading, error, partial data, long content, short content, small screen
(390px), first use, returning user, permission denied, offline, reduced motion,
200% zoom, keyboard-only.

For each, say whether it is shown, and if not, say so rather than assuming it is
missing by mistake.

## What not to report

- Anything that is a matter of preference rather than a criterion above
- Token names, raw colors, arbitrary radii, fonts, or off-scale spacing, which
  belong in the design-system check and `missa-token-mapping`
- Component usage and states, which belong in `missa-component-docs`
- Copy rewrites. Flag unclear copy and say what is unclear
- Product decisions. Note them for a person and move on
- Accessibility rulings. Report what you saw and hand the judgement over
