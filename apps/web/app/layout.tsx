import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

/**
 * Brand typography per _bmad-output/planning-artifacts/ux-design-specification.md
 * -> Visual Design Foundation: Fraunces for headlines only, Instrument Sans
 * for UI/body, Fragment Mono for tabular/data display. Self-hosted from the
 * same font files landing/ already uses (latin-subset variants only, since
 * the app doesn't need the full charset coverage the marketing page ships) --
 * NOT the shadcn-init default (Geist), which is a generic look this brand
 * already has real typography to replace.
 */
const fraunces = localFont({
  src: '../fonts/fraunces.woff2',
  variable: '--font-heading',
  weight: '100 900',
  display: 'swap',
});

const instrumentSans = localFont({
  src: '../fonts/instrument-sans.woff2',
  variable: '--font-sans',
  weight: '400 700',
  display: 'swap',
});

const fragmentMono = localFont({
  src: '../fonts/fragment-mono.woff2',
  variable: '--font-mono',
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Missa',
  description: 'The free opportunity tracker that updates itself.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(fraunces.variable, instrumentSans.variable, fragmentMono.variable, 'font-sans')}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
