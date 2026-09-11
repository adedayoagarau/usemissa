# Rankings alignment

User-directed adjustment to match the existing Opportunities catalogue. Reuses its main container, heading, eyebrow and description CSS, plus installed Button, Input, Field, NativeSelect and Table. No replacement of Opportunities.

Status intent uses shared RankingTierBadge (installed Badge) and RankingMovement (Lucide arrows) in components/missa/ranking-indicators.tsx. Tier 1 amber, Tier 2 blue, Tier 3 green, Tier 4 neutral; upward movement green, downward red. Text and directional icons retain meaning without color. Semantic ranking tokens map to existing Tailwind palette primitives. The main index, legacy table and methodology share the tier wrapper. Registered semantic wrappers may import their selected primitive; the validator continues rejecting unregistered feature imports.

The heading is Magazine rankings. Methodology has a single plain link below results and pagination. Removed the opening explanation and footer advice. The preview uses the shared forest theme rather than a separate teal override.

Validation: typecheck and design-system policy pass. Browser inspection at 1440px and 390px confirms the shared Instrument Sans heading sizes (24px and 20px), no horizontal overflow, and working search empty state. Movement is static and has an accessible label; zero/absent movement is omitted. No physical-phone validation or production deployment claimed.
