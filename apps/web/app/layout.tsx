import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { DEFAULT_DESCRIPTION, SITE_NAME } from '@/lib/seo';
import { siteUrl } from '@/lib/siteUrl';

/**
 * Missa typography: Ysabeau carries both editorial display and product UI;
 * Fragment Mono remains reserved for technical and tabular metadata.
 */
const ysabeau = localFont({
  src: '../fonts/ysabeau-variable.ttf',
  variable: '--font-heading',
  weight: '100 900',
  display: 'swap',
});

const ysabeauOffice = localFont({
  src: '../fonts/ysabeau-variable.ttf',
  variable: '--font-sans',
  weight: '100 900',
  display: 'swap',
});

const fragmentMono = localFont({
  src: '../fonts/fragment-mono.woff2',
  variable: '--font-mono',
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — Submission opportunities tailored for you`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [{ url: '/brand/missa-wordmark-80.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/brand/missa-wordmark-240.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(ysabeau.variable, ysabeauOffice.variable, fragmentMono.variable, 'font-sans')}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AnalyticsProvider>{children}</AnalyticsProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
