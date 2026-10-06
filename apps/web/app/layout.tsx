import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { SiteBeacon } from "@/components/site-beacon";
import { CookieConsent } from "@/components/missa/cookie-consent";
import { ShortlistSync } from "@/components/missa/homepage-shortlist";
import { WebMcpProvider } from "@/components/missa/webmcp-provider";
import { consentAnsweredScript } from "@/lib/analyticsConsent";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { signedInHintScript } from "@/lib/signedInHint";
import { siteUrl } from "@/lib/siteUrl";

/**
 * Missa typography: Newsreader / Instrument Sans / Fragment Mono.
 * Only the body face is preloaded. Preloads download at high priority before
 * the stylesheet is even parsed, and the 215 KB variable Newsreader file was
 * competing with the render-blocking CSS on slow mobile connections. The
 * heading and mono faces load once the page uses them and swap in.
 */
const newsreader = localFont({
  src: "../fonts/newsreader-variable.woff2",
  variable: "--font-heading",
  weight: "200 800",
  display: "swap",
  preload: false,
});

const instrumentSans = localFont({
  src: "../fonts/instrument-sans.woff2",
  variable: "--font-sans",
  weight: "400 700",
  display: "swap",
});

const fragmentMono = localFont({
  src: "../fonts/fragment-mono.woff2",
  variable: "--font-mono",
  weight: "400",
  display: "swap",
  preload: false,
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
    type: "website",
    images: [
      {
        url: "/brand/missa-social-share.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Missa, creative opportunities with their source and limits kept visible.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/missa-social-share.png"],
  },
  // Static platform manifest. It is a data file rather than feature code, so
  // its literal theme colours do not belong in the token-checked source tree.
  manifest: "/manifest.webmanifest",
  // Icon links come from the App Router file conventions:
  // app/favicon.ico, app/icon.svg, app/icon.png, app/apple-icon.png.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        newsreader.variable,
        instrumentSans.variable,
        fragmentMono.variable,
        "font-sans",
      )}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: consentAnsweredScript() }} />
        <script dangerouslySetInnerHTML={{ __html: signedInHintScript() }} />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <WebMcpProvider />
          </Suspense>
          <SiteBeacon />
          <CookieConsent />
          <AnalyticsProvider>{children}</AnalyticsProvider>
          <ShortlistSync />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
