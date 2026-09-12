"use client";

import posthog from "posthog-js";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  type ClientAnalyticsEventName,
  validateAnalyticsEventProperties,
} from "@/lib/analytics-contract";

let initialized = false;

function ensurePostHog(): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
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
  }
  return true;
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
  if (ensurePostHog()) posthog.capture(eventName, properties);
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
    const attribution = browserAttributionProperties();
    recordFirstPartyEvent("page_view", pathname, attribution);
    if (ensurePostHog())
      posthog.capture("$pageview", { path: pathname, ...attribution });
  }, [pathname]);

  return children;
}
