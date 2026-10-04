"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { PostHog } from "posthog-js";
import {
  type ClientAnalyticsEventName,
  validateAnalyticsEventProperties,
} from "@/lib/analytics-contract";
import { hasAnalyticsConsent, subscribeConsent } from "@/lib/analyticsConsent";

/**
 * The PostHog SDK is the largest script on every page, and most visitors never
 * consent to it, so it is fetched on first consented use instead of shipping
 * with the page.
 */
let posthogModule: Promise<PostHog> | undefined;
let initialized = false;

function withPostHog(use: (posthog: PostHog) => void): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !hasAnalyticsConsent()) return;
  posthogModule ??= import("posthog-js").then((module) => module.default);
  posthogModule.then(
    (posthog) => {
      // Consent can be withdrawn while the SDK downloads.
      if (!hasAnalyticsConsent()) return;
      if (!initialized) {
        posthog.init(key, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
          capture_pageview: false,
          capture_pageleave: true,
          autocapture: false,
          disable_session_recording: true,
          persistence: "localStorage",
          person_profiles: "identified_only",
        });
        initialized = true;
      } else {
        posthog.opt_in_capturing();
      }
      use(posthog);
    },
    () => {
      // A failed download (offline, blocked) is retried on the next event.
      posthogModule = undefined;
    },
  );
}

/** Stop and discard third-party analytics state when consent is withdrawn. */
function stopPostHog(): void {
  if (!initialized || !posthogModule) return;
  void posthogModule.then((posthog) => {
    posthog.opt_out_capturing();
    posthog.reset();
  });
}

function analyticsSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const key = "missa.analytics.session.v1";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return undefined;
  }
}

function recordFirstPartyEvent(
  eventName: ClientAnalyticsEventName,
  path: string,
  properties?: Record<string, unknown>,
): void {
  if (!hasAnalyticsConsent()) return;
  if (validateAnalyticsEventProperties(eventName, properties)) return;
  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventName,
      path,
      sessionId: analyticsSessionId(),
      properties,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

export function captureProductEvent(
  eventName: ClientAnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (validateAnalyticsEventProperties(eventName, properties)) return;
  withPostHog((posthog) => posthog.capture(eventName, properties));
  recordFirstPartyEvent(eventName, window.location.pathname, properties);
}

/**
 * Keep acquisition measurement useful without sending full referrer URLs or
 * browser identifiers to the first-party event ledger.
 */
export function browserAttributionProperties(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const properties: Record<string, string> = {};
  const url = new URL(window.location.href);
  const trackedParameters = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ];

  for (const parameter of trackedParameters) {
    const value = url.searchParams.get(parameter)?.trim();
    if (value) properties[parameter] = value.slice(0, 200);
  }

  properties.device_class =
    window.innerWidth < 768
      ? "mobile"
      : window.innerWidth < 1024
        ? "tablet"
        : "desktop";

  if (document.referrer) {
    try {
      const referrerHost = new URL(document.referrer).hostname;
      if (referrerHost && referrerHost !== window.location.hostname) {
        properties.referrer_host = referrerHost.slice(0, 120);
      }
    } catch {
      // Ignore malformed referrers; attribution should never affect discovery.
    }
  }

  return properties;
}

export function recordPublicAnalyticsEvent(
  eventName: Extract<ClientAnalyticsEventName, `public.${string}`>,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  const payload = {
    ...browserAttributionProperties(),
    ...(properties ?? {}),
  };
  captureProductEvent(eventName, payload);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    function measurePageView() {
      if (!hasAnalyticsConsent()) return;
      const attribution = browserAttributionProperties();
      recordFirstPartyEvent("page_view", pathname, attribution);
      withPostHog((posthog) =>
        posthog.capture("$pageview", { path: pathname, ...attribution }),
      );
    }

    measurePageView();
    // Accepting consent mid-session should start measuring immediately rather
    // than waiting for the next navigation. Withdrawing it must stop and
    // discard third-party state right away.
    return subscribeConsent((choice) => {
      if (choice === "accepted") {
        measurePageView();
      } else {
        stopPostHog();
      }
    });
  }, [pathname]);

  return children;
}
