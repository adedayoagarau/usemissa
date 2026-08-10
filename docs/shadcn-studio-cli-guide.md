# Shadcn Studio CLI guide for Missa

**Source:** https://shadcnstudio.com/docs/getting-started/how-to-use-shadcn-cli  
**Captured:** 7 August 2026

This is the project-specific operating note for using Shadcn Studio’s free and premium registries in Missa. It is a concise implementation guide, not a copy of the upstream documentation.

## Current Missa compatibility

Missa already has the required foundation:

- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn CLI 4
- Base UI primitives
- `apps/web/components.json`
- `apps/web/app/globals.css`

The project’s Shadcn Studio registry configuration lives in `apps/web/components.json`. It uses environment-variable references for premium access; credentials must never be committed.

## Registry namespaces

| Namespace | Content |
|---|---|
| `@shadcn-studio` | Free components, blocks, and themes |
| `@ss-components` | Free and premium components |
| `@ss-blocks` | Free and premium blocks |
| `@ss-pages` | Free and premium pages |
| `@ss-themes` | Free, premium, and user-generated themes |

## Secure credentials

Premium registry requests use these local environment variables:

```bash
EMAIL=account-email
LICENSE_KEY=license-key
```

Keep them in a local ignored environment file or provide them ephemerally to a command. Never place their values in source code, documentation, command output, git history, or chat. The repository ignores `.env` and `.env*.local`.

## Installation commands

Run commands from the repository root and target the web app with `--cwd apps/web`.

### Component

```bash
npx shadcn@latest add @ss-components/<component-name> --cwd apps/web
```

### Block

```bash
npx shadcn@latest add @ss-blocks/<block-name> --cwd apps/web
```

### Page

```bash
npx shadcn@latest add @ss-pages/<page-name> --cwd apps/web
```

### Theme

Themes can modify tokens and component styling more broadly. Preview and review the generated diff before applying one to Missa. Do not replace `globals.css` wholesale; merge only approved token/style changes.

## Safe Missa workflow

1. Select **Base UI**, because Missa’s existing primitives use Base UI.
2. Select the relevant Shadcn Studio style/variant.
3. Run the command with `--dry-run` first.
4. Review the file list and diff.
5. Do not use `--overwrite` on shared primitives without an explicit comparison and approval.
6. Keep reference demos under `apps/web/components/shadcn-studio/` where appropriate.
7. Adapt the installed source to Missa’s true-white canvas, tokens, typography, density, evidence states, and accessibility requirements.
8. Use `npm run typecheck --workspace=@missa/web` and the relevant lint/e2e checks.

Multiple items may be installed in one command, but batch by component family and review the result before moving to the next family.

## Current adoption status

- Registry configuration: installed in `apps/web/components.json`.
- `@ss-components/button-01`: verified and present at `apps/web/components/shadcn-studio/button/button-01.tsx`.
- `@ss-components/button-41`: verified and present at `apps/web/components/shadcn-studio/button/button-41.tsx`.
- Shared `apps/web/components/ui/button.tsx`: retained as the source of truth, with Missa 44px/36px sizing and an opt-in `shine` variant adapted from the premium demo.
- `apps/web/components/shadcn-studio/button/button-family-demo.tsx`: reference showcase for default, outline, icon, destructive, and shine roles.
- MCP: not required for CLI installation.
- Figma MCP: only required for the Figma-to-code workflow.

## Missa redesign policy

Shadcn Studio is a source of implementation patterns and visual variants, not Missa’s product design authority. Keep `DESIGN.md`, the content style guide, canonical taxonomy behavior, evidence/provenance language, and Profile/Organization register decisions authoritative.

### Recommended install order

1. Button, Badge, Card, Input, Field, Label, Select.
2. Dialog, Sheet, Drawer, Popover, Dropdown, Tooltip.
3. Tabs, Table, Calendar, Command, Sidebar, Pagination.
4. Empty, Skeleton, Spinner, Progress, Sonner.
5. Product composites: opportunity cards, filters, evidence panels, submission states, dashboards, and detail drawers.

### Source notes

The upstream guide states that Shadcn Studio uses shadcn CLI v4, supports category-specific registries, supports multiple item installation, requires local environment variables for premium content, and recommends reviewing/customizing installed components. See the [official guide](https://shadcnstudio.com/docs/getting-started/how-to-use-shadcn-cli) for updates.

