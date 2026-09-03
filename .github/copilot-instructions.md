# Missa coding instructions

For every UI task, follow `AGENTS.md` and read `DESIGN.md`,
`apps/web/component-policy.json`, and `apps/web/component-catalogue.json` before
generating markup or styles. The reusable directive is
`docs/ai-ui-build-directive.md`.

Select components by user intent through the policy. Prefer installed Shadcn
primitives and Missa semantic components; do not invent route-local primitives,
directly import licensed Studio variants into feature code, or introduce raw
colors, fonts, radii, shadows, or motion. Run `npm run check:design-system`
before handing off UI changes.
