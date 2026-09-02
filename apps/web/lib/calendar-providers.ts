import type {
  CalendarProvider,
  CalendarSyncLease,
} from "@missa/radar-adapters";
const GOOGLE_SCOPE =
  "openid email https://www.googleapis.com/auth/calendar.app.created";
const MICROSOFT_SCOPE = "openid offline_access User.Read Calendars.ReadWrite";
const config = (provider: CalendarProvider) =>
  provider === "google"
    ? {
        clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
        authorize: "https://accounts.google.com/o/oauth2/v2/auth",
        token: "https://oauth2.googleapis.com/token",
        scope: GOOGLE_SCOPE,
      }
    : {
        clientId: process.env.MICROSOFT_CALENDAR_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET,
        redirectUri: process.env.MICROSOFT_CALENDAR_REDIRECT_URI,
        authorize:
          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scope: MICROSOFT_SCOPE,
      };
export function calendarProviderConfigured(provider: CalendarProvider) {
  const c = config(provider);
  return Boolean(c.clientId && c.clientSecret && c.redirectUri);
}
export function calendarAuthorization(
  provider: CalendarProvider,
  state: string,
  challenge: string,
) {
  const c = config(provider);
  if (!c.clientId || !c.redirectUri)
    throw new Error("Calendar provider is not configured.");
  const query = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: "code",
    scope: c.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  if (provider === "google") {
    query.set("access_type", "offline");
    query.set("prompt", "consent");
    query.set("include_granted_scopes", "true");
  }
  return { url: `${c.authorize}?${query}`, redirectUri: c.redirectUri };
}
async function json(url: string, init: RequestInit) {
  const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15_000),
    }),
    body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Calendar provider declined the request.");
  return body as Record<string, unknown>;
}
export async function exchangeCalendarCode(
  provider: CalendarProvider,
  code: string,
  verifier: string,
  redirectUri: string,
) {
  const c = config(provider);
  if (!c.clientId || !c.clientSecret)
    throw new Error("Calendar provider is not configured.");
  const body = await json(c.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      scope: c.scope,
    }),
  });
  const access = String(body.access_token || ""),
    refresh = String(body.refresh_token || ""),
    scopes = String(body.scope || "")
      .split(/\s+/)
      .filter(Boolean);
  if (!access || !refresh)
    throw new Error("Calendar provider did not grant offline access.");
  if (provider === "google") {
    if (
      !scopes.includes("https://www.googleapis.com/auth/calendar.app.created")
    )
      throw new Error(
        "Google did not grant the dedicated-calendar permission.",
      );
    const identity = await json(
        "https://openidconnect.googleapis.com/v1/userinfo",
        { headers: { Authorization: `Bearer ${access}` } },
      ),
      calendar = await json(
        "https://www.googleapis.com/calendar/v3/calendars",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: "Missa",
            description: "Events you explicitly approved in Missa.",
          }),
        },
      );
    return {
      providerSubject: String(identity.sub || ""),
      refreshToken: refresh,
      calendarId: String(calendar.id || ""),
      scopes,
    };
  }
  const identity = await json("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${access}` },
    }),
    calendar = await json("https://graph.microsoft.com/v1.0/me/calendars", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Missa" }),
    });
  return {
    providerSubject: String(identity.id || ""),
    refreshToken: refresh,
    calendarId: String(calendar.id || ""),
    scopes,
  };
}
export async function revokeCalendarProvider(
  provider: CalendarProvider,
  token: string,
) {
  if (provider === "google") {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(15_000),
    });
    return;
  } /* Microsoft has no per-token revocation endpoint; local credential destruction and the user's consent portal are the supported boundary. */
}

async function providerAccessToken(
  provider: CalendarProvider,
  refreshToken: string,
) {
  const c = config(provider);
  if (!c.clientId || !c.clientSecret)
    throw new Error("provider_not_configured");
  const body = await json(c.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: c.scope,
    }),
  });
  const token = String(body.access_token || "");
  if (!token) throw new Error("access_token_missing");
  return token;
}

export async function deliverCalendarSync(lease: CalendarSyncLease) {
  const token = await providerAccessToken(lease.provider, lease.refreshToken),
    auth = { Authorization: `Bearer ${token}` };
  if (lease.operation === "delete") {
    if (!lease.providerEventId) return undefined;
    const endpoint =
      lease.provider === "google"
        ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(lease.calendarId)}/events/${encodeURIComponent(lease.providerEventId)}`
        : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(lease.calendarId)}/events/${encodeURIComponent(lease.providerEventId)}`;
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: auth,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok && response.status !== 404)
      throw new Error(`provider_delete_${response.status}`);
    return undefined;
  }
  if (!lease.event) throw new Error("event_missing");
  const event = lease.event;
  if (lease.provider === "google") {
    const body = event.allDay
      ? {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: { date: event.startAt.slice(0, 10) },
          end: {
            date: new Date(new Date(event.endAt).getTime() + 86400000)
              .toISOString()
              .slice(0, 10),
          },
          extendedProperties: { private: { missaEventId: event.id } },
        }
      : {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: { dateTime: event.startAt },
          end: { dateTime: event.endAt },
          extendedProperties: { private: { missaEventId: event.id } },
        };
    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(lease.calendarId)}/events${lease.providerEventId ? `/${encodeURIComponent(lease.providerEventId)}` : ""}`,
      result = await json(endpoint, {
        method: lease.providerEventId ? "PUT" : "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    return String(result.id || "");
  }
  const body = {
      subject: event.title,
      body: { contentType: "text", content: event.description || "" },
      location: { displayName: event.location || "" },
      isAllDay: event.allDay,
      start: { dateTime: event.startAt.replace(/Z$/, ""), timeZone: "UTC" },
      end: { dateTime: event.endAt.replace(/Z$/, ""), timeZone: "UTC" },
      singleValueExtendedProperties: [
        {
          id: "String {66f5a359-4659-4830-9070-00040ec6ac6e} Name missaEventId",
          value: event.id,
        },
      ],
    },
    endpoint = `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(lease.calendarId)}/events${lease.providerEventId ? `/${encodeURIComponent(lease.providerEventId)}` : ""}`,
    result = await json(endpoint, {
      method: lease.providerEventId ? "PATCH" : "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  return String(result.id || lease.providerEventId || "");
}
