# Beta UI follow-up

The journal profile keeps its existing data and routes. Public discovery-source links have been removed from both the identity header and related-opportunity cards. The remaining external actions use the journal website and submission guidelines. Social buttons and repetitive identity badges no longer crowd the header. Submission facts appear first; editorial/ranking details and response reports use the installed Accordion disclosure group. Copy uses plain labels.

Signup reuses Input and Button. Its optional alternate waitlist email uses Accordion, with persistent password guidance and existing associated error messages. Mobile inputs use 16px text. The brand panel uses existing semantic colors and removes decorative circles. The wordmark links home.

Policy: input.short-text -> Input; disclosure.group -> Accordion; existing action Button. Sources: apps/web/components/ui/{input,button,accordion}. No new component or variant introduced.

Validation: workspace TypeScript passes, scoped ESLint passes, design-system validator passes. Chromium at 390px shows no horizontal overflow. Signup empty validation and keyboard disclosure checked; automated axe has no serious/critical findings. Desktop and reduced-motion/reflow viewport checked. Physical iPhone and actual browser 200% zoom are not claimed.

Research reference: https://www.w3.org/WAI/tutorials/forms/instructions/ for persistent labels and instructions. Repository policy and user source-authority instructions govern the implementation.

Database work: applied existing 0042_creator_product_states.sql and 0031_creator_relational_authority.sql transactionally; additionally applied the workspace_command_receipts/audit/outbox dependency block from 0030. Existing journal entries were preserved; this is a scoped schema repair, not a full migration-runner reconciliation. Reserved QA account signup succeeds on hosted preview. Onboarding state and tracker write/read pass against PostgreSQL. Hosted Saved/Tracker selected old in-memory storage because MISSA_CREATOR_RELATIONAL_AUTHORITY was absent; preview now sets it to 1, pending rebuilt hosted verification. Production sensitive environment values are intentionally redacted by Vercel, not evidence of missing secrets.
