'use client';

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

/**
 * Standard shadcn/ui wrapper around next-themes' ThemeProvider -- needed
 * because ThemeProvider must be a client component and next-themes doesn't
 * ship one pre-marked with 'use client'.
 *
 * React 19 / Next 16 warn when next-themes remounts its FOUC <script> on the
 * client. `scripts/patch-next-themes.mjs` (postinstall) keeps that script
 * SSR-only; see https://github.com/pacocoursey/next-themes/issues/385.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{ suppressHydrationWarning: true }}
    >
      {children}
    </NextThemesProvider>
  );
}
