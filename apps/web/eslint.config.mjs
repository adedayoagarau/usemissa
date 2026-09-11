import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
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
              group: ["@/components/shadcn-studio/*", "@/components/shadcn-studio/**"],
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
