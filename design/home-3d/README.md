# Home page — 3D motion ideation

Design exploration for the new Missa public home page: a CSS-3D hero in which
scattered opportunity fragments (deadline, funding, eligibility, fee, source)
settle into one indexed opportunity card, followed by the full section
sequence (category index line, problem statement, product demonstration,
how-it-works spine, source transparency, recommendation philosophy, waitlist,
footer).

Artboards (Design Components format, viewable on the published design canvas):

- `Main.dc.html` — full desktop home page, 1440px, light "paper" theme.
- `HeroNight.dc.html` — alternative hero direction: "Night archive," a ranked
  index receding into depth on deep aubergine.
- `Mobile.dc.html` — 390px stacked version; the pinned 3D sequence is replaced
  by a simple stacked progression.
- `canvas.json` — canvas layout plus motion-intent annotations.

Design system: aubergine `#5A3F68` (matches `DESIGN.md` aubergine-600),
paper `#F7F3EE`, ink `#19151C`; Newsreader for display, Onest for UI.
Depth is CSS `perspective` + `rotateX/Y/translateZ` only — no WebGL. Ease
`cubic-bezier(0.22, 1, 0.36, 1)`; reduced-motion renders the settled state.

All listings shown are fictional demo data.
