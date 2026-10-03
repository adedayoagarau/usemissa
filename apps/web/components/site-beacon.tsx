'use client';

import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { useEffect, useRef } from 'react';

/**
 * Cookieless first-party page analytics. Sends no cookies and stores nothing on
 * the device; the server keeps only a daily-rotating salted hash. Honours
 * Global Privacy Control. Admin and API routes are never counted.
 */

const ENDPOINT = '/api/analytics/hit';
const MAX_ERRORS_PER_PAGE = 5;

function optedOut(): boolean {
  return typeof navigator !== 'undefined' && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

function untracked(path: string): boolean {
  return /^\/(?:admin|api|design-system)(?:\/|$)/u.test(path);
}

function send(payload: Record<string, unknown>) {
  if (optedOut()) return;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
  } catch {
    // Fall through to fetch.
  }
  void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, credentials: 'omit', headers: { 'content-type': 'text/plain' } }).catch(() => undefined);
}

export function SiteBeacon() {
  const pathname = usePathname();
  const firstView = useRef(true);
  const errorsSent = useRef(new Set<string>());

  useEffect(() => {
    if (!pathname || untracked(pathname)) return;
    const payload: Record<string, unknown> = { kind: 'pageview', path: pathname };
    if (firstView.current) {
      firstView.current = false;
      const params = new URLSearchParams(window.location.search);
      payload.referrer = document.referrer || undefined;
      payload.utmSource = params.get('utm_source') ?? params.get('ref') ?? undefined;
      payload.utmMedium = params.get('utm_medium') ?? undefined;
      payload.utmCampaign = params.get('utm_campaign') ?? undefined;
    }
    errorsSent.current.clear();
    send(payload);
  }, [pathname]);

  useEffect(() => {
    function report(message: string) {
      const path = window.location.pathname;
      if (untracked(path) || !message || errorsSent.current.size >= MAX_ERRORS_PER_PAGE || errorsSent.current.has(message)) return;
      errorsSent.current.add(message);
      send({ kind: 'error', path, message });
    }
    const onError = (event: ErrorEvent) => report(event.message || String(event.error ?? ''));
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: unknown } | undefined;
      report(typeof reason?.message === 'string' ? `Unhandled rejection: ${reason.message}` : 'Unhandled promise rejection');
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useReportWebVitals((metric) => {
    const path = window.location.pathname;
    if (untracked(path) || !['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].includes(metric.name)) return;
    send({ kind: 'vital', path, name: metric.name, value: Math.round(metric.value * (metric.name === 'CLS' ? 1000 : 1)) / (metric.name === 'CLS' ? 1000 : 1) });
  });

  return null;
}
