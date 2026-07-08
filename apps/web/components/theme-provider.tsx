'use client';

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

/**
 * Standard shadcn/ui wrapper around next-themes' ThemeProvider -- needed
 * because ThemeProvider must be a client component and next-themes doesn't
 * ship one pre-marked with 'use client'.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
