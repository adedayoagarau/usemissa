import { defineConfig, globalIgnores } from "eslint/config";
import { plugin as shadcn } from "@shadcn/lint";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    plugins: { shadcn },
    settings: {
      shadcn: {
        ui: "@/components/ui",
        componentImports: ["^@/components/missa(/|$)"],
        ignoreImports: [
          "^@/components/design-system(/|$)",
          "^@/components/shadcn-studio(/|$)",
        ],
        note: "See DESIGN.md and apps/web/component-policy.json for Missa's component rules and approved exceptions.",
      },
    },
    rules: {
      // Product components must express visual changes through approved variants
      // or narrow contracts. The review script is retained for focused reporting.
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout"],
          contracts: [
            {
              pattern: "^Button$",
              allow: ["layout", "w-full", "mt-*", "mb-*", "self-*"],
            },
            {
              pattern: "^RadioGroup$",
              allow: ["layout", "spacing"],
            },
            {
              pattern: "^CardContent$",
              allow: ["layout", "spacing"],
            },
            {
              pattern: "^Card(Header|Footer)$",
              allow: ["layout", "spacing", "typography"],
            },
            {
              pattern: "^CardTitle$",
              allow: ["layout", "spacing", "typography"],
            },
            {
              pattern: "^Table(Cell|Head|Caption)$",
              allow: ["layout", "spacing", "typography"],
            },
            {
              pattern: "^Table(Row|Header|Body|Footer)?$",
              allow: ["layout", "spacing"],
            },
            {
              pattern: "^(Sheet|Dialog)Content$",
              allow: ["layout", "spacing"],
            },
            {
              pattern: "^Dialog(Title|Footer)$",
              allow: ["layout", "spacing", "typography"],
            },
            {
              pattern: "^Tabs(List|Content)?$",
              allow: ["layout", "spacing"],
            },
            {
              pattern: "^Input$",
              allow: ["layout", "spacing"],
            },
            {
              pattern: "^InputOTPSlot$",
              allow: ["layout", "spacing", "typography"],
            },
            {
              pattern: "^Field$",
              allow: ["layout", "spacing"],
            },
            {
              pattern: "^FieldLabel$",
              allow: ["typography", "sr-only"],
            },
            {
              pattern: "^Calendar$",
              allow: ["layout", "color"],
            },
            {
              pattern:
                "^(SheetHeader|SheetTitle|SheetDescription|Collapsible|CollapsibleContent)$",
              allow: ["layout", "spacing", "typography"],
            },
            {
              pattern: "^Skeleton$",
              allow: ["layout", "shape"],
            },
          ],
          message: {
            spacing:
              "Use a {{component}} size ({{sizes}}) or a Missa semantic component. See {{file}}.",
            shape:
              "Use a {{component}} variant ({{variants}}) or a Missa semantic component. See {{file}}.",
            color:
              "Use a {{component}} variant ({{variants}}) or a Missa semantic component. See {{file}}.",
            typography:
              "Keep typography inside the component contract or use a Missa semantic component. See {{file}}.",
          },
        },
      ],
      // An underscore marks an intentionally discarded value at a boundary.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/shadcn-studio/*",
                "@/components/shadcn-studio/**",
              ],
              message:
                "Studio variants are reference source. Import them only in design-system review surfaces or adapt them behind @/components/missa.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "app/design-system/**/*.{js,jsx,ts,tsx}",
      "components/design-system/**/*.{js,jsx,ts,tsx}",
      "components/missa/**/*.{js,jsx,ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: [
      "app/design-system/**/*.{js,jsx,ts,tsx}",
      "components/design-system/**/*.{js,jsx,ts,tsx}",
      "components/shadcn-studio/**/*.{js,jsx,ts,tsx}",
      "components/ui/**/*.{js,jsx,ts,tsx}",
      "**/*preview*.{js,jsx,ts,tsx}",
    ],
    rules: {
      "shadcn/no-restyle": "off",
    },
  },
  {
    // These are third-party component examples kept for local design-system review.
    // They intentionally demonstrate raw image URLs and libraries React Compiler skips.
    files: ["components/shadcn-studio/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "playwright-report/**", "test-results/**"]),
]);
