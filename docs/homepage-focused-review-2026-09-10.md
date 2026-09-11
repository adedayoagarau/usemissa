# Homepage revision

Review route: `/design-system/homepage-focused`.

## Content decisions

- Discovery uses the user's sentence: “Your next opportunity is one click away.” Removed the eyebrow and supporting paragraph.
- Current calls has no paragraph repeating discovery.
- Portfolio replaces the Applications/Portfolio marketing tabs. One sentence names what people can do; the public portfolio supplies the demonstration.
- Removed the sample creator's biography that repeated the discipline list.
- Organization heading needs no supporting description.
- Portfolio FAQ now explains draft privacy instead of repeating that portfolios exist.
- Closing invitation and footer no longer repeat the discovery description.
- Recorded the user's read-aloud and page-level repetition rules in both canonical content guides. This revision reviews homepage copy, not every route in the application.

## Component choices

`composition.homepage-focused`: navigation uses existing native category links; data display uses canonical opportunity cards and validated catalogue totals. `HomepagePortfolio` uses installed Button for labeled, pressed theme choices and `CreatorPortfolioStudio` for the actual sample portfolio. The new showcase presentation retains image enlargement, poem reading, and format selection. It uses the existing homepage palette, typography, borders, and radii.

Footer navigation and illustration now share one footer element. An alpha mask fades the artwork into the white footer surface; no image asset was changed.

## Verification

Type checking, lint, language and design-system checks pass. Browser checks covered desktop and a 390px viewport override (355 CSS pixels at the browser's existing zoom), no horizontal overflow, White/Night theme changes, keyboard theme activation, and poem dialog opening. Footer fade inspected at desktop. Existing loading and retry states retained. Full 200% zoom and all application routes were not certified in this pass.
