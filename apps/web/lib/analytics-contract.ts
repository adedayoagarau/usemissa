export type AnalyticsPropertyValue = string | number | boolean;

export type AnalyticsAuthority = "client" | "server";

export interface AnalyticsEventDefinition {
  authority: AnalyticsAuthority;
  description: string;
  owner: "growth" | "creator-product" | "organizations" | "platform";
  purpose: string;
  requiredProperties: readonly string[];
  optionalProperties: readonly string[];
  retentionDays: number;
}

const attributionProperties = [
  "device_class",
  "referrer_host",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const firstSaveObservationProperties = [
  "opportunity_id",
  "snapshot_fingerprint",
  "result",
  "change_codes",
  "next_action_kind",
  "reason",
] as const;

export const ANALYTICS_EVENTS = {
  page_view: {
    authority: "client",
    description: "A permitted public or authenticated route became visible.",
    owner: "growth",
    purpose: "Measure reach and route-level navigation.",
    requiredProperties: [],
    optionalProperties: attributionProperties,
    retentionDays: 90,
  },
  "public.discovery_view": {
    authority: "client",
    description: "A public opportunity index became visible.",
    owner: "growth",
    purpose: "Measure discovery reach without identifying anonymous visitors.",
    requiredProperties: ["surface", "resultCount"],
    optionalProperties: attributionProperties,
    retentionDays: 90,
  },
  "public.collection_view": {
    authority: "client",
    description: "A public editorial opportunity collection became visible.",
    owner: "growth",
    purpose: "Compare discovery collection use.",
    requiredProperties: ["collection", "resultCount"],
    optionalProperties: attributionProperties,
    retentionDays: 90,
  },
  "public.opportunity_view": {
    authority: "client",
    description: "A public opportunity detail became visible.",
    owner: "creator-product",
    purpose: "Measure evaluation of a canonical opportunity.",
    requiredProperties: ["opportunityId"],
    optionalProperties: ["slug", ...attributionProperties],
    retentionDays: 180,
  },
  "public.waitlist_cta_clicked": clientGrowth("A waitlist join action was selected.", []),
  "public.waitlist_form_started": clientGrowth("The waitlist email field received its first focus.", []),
  "public.waitlist_submit_attempted": clientGrowth("A waitlist form submission was attempted.", []),
  "public.waitlist_join_failed": clientGrowth("A waitlist submission failed.", ["reason"]),
  "public.waitlist_joined": serverGrowth(
    "A durable waitlist signup was created or replayed.",
    ["waitlist", "created"],
    attributionProperties,
  ),

  opportunity_search_submitted: clientCreator("A discovery search was submitted.", ["hasQuery", "category"]),
  opportunity_filter_changed: clientCreator("A discovery filter changed.", ["filter", "enabled"]),
  opportunity_filters_cleared: clientCreator("All discovery filters were cleared.", []),
  opportunity_taxonomy_selected: clientCreator("A taxonomy facet selection changed.", ["facet", "selected"], ["termId"]),
  opportunity_search_saved: clientCreator("A creator saved a reusable search.", ["taxonomyTermCount"]),
  work_taxonomy_saved: clientCreator("A creator saved taxonomy for a private Work.", ["taxonomyTermCount"]),

  "discovery.opportunity_save_intent_created": serverCreator("A signed-out Save intent was durably held.", ["journey_id", "transition"], firstSaveObservationProperties),
  "auth.authentication_required": serverCreator("A protected Save required authentication.", ["journey_id", "transition"], firstSaveObservationProperties),
  "auth.authentication_succeeded": serverCreator("Authentication completed inside the first-Save journey.", ["journey_id", "transition"], firstSaveObservationProperties),
  "journey.intent_revalidated": serverCreator("A held Save intent was revalidated against current opportunity truth.", ["journey_id", "transition"], firstSaveObservationProperties),
  "journey.material_change_presented": serverCreator("A material opportunity change was shown before Save continued.", ["journey_id", "transition"], firstSaveObservationProperties),
  "journey.state_recovered": serverCreator("A first-Save journey resumed after interruption.", ["journey_id", "transition"], firstSaveObservationProperties),
  "journey.abandoned": serverCreator("A first-Save journey ended without a durable Save.", ["journey_id", "transition"], firstSaveObservationProperties),
  "tracker.opportunity_created": serverCreator("A new account-owned Tracker record was created.", ["journey_id", "transition", "opportunity_id"], firstSaveObservationProperties),
  "tracker.opportunity_already_saved": serverCreator("An idempotent Save resolved to an existing Tracker record.", ["journey_id", "transition", "opportunity_id"], firstSaveObservationProperties),
  "discovery.opportunity_saved": serverCreator("An opportunity is durably present in the account Tracker.", ["journey_id", "transition", "opportunity_id"], firstSaveObservationProperties),
  "tracker.next_action_presented": serverCreator("A next action was presented after Save.", ["journey_id", "transition"], firstSaveObservationProperties),
  "tracker.next_action_completed": serverCreator("A creator completed the recorded next action.", ["journey_id", "transition"], firstSaveObservationProperties),
  "journey.guidance_dismissed": serverCreator("A creator dismissed first-Save guidance.", ["journey_id", "transition"], firstSaveObservationProperties),
  "workspace.preparation_started": serverCreator("A creator durably moved an opportunity into preparation.", ["opportunity_id"]),
  "workspace.export_created": serverCreator("A private portable export was successfully created.", ["format", "scope", "tracker_rows", "library_rows"]),
  "application.official_destination_opened": clientCreator("A creator opened the official external application destination.", ["opportunity_id", "surface"]),
  "application.submission_marked_by_user": serverCreator("A creator recorded a submission without provider confirmation.", ["opportunity_id", "occurred_on"]),
  "application.provider_receipt_recorded": serverCreator("Missa or a provider produced durable submission evidence.", ["submission_id"], ["opportunity_id", "provider"]),
  "application.status_recorded": serverCreator("A creator recorded a lifecycle status in Tracker.", ["opportunity_id", "status", "occurred_on"]),
  "outcome.response_recorded": serverCreator("A creator or authoritative workflow recorded an application response.", ["opportunity_id", "outcome"]),
  "auth.login_succeeded": serverCreator(
    "A password or Neon Auth login succeeded.",
    ["method"],
    ["linked"],
  ),
  "auth.signup_succeeded": serverCreator(
    "A new account was created.",
    ["method"],
    ["linked"],
  ),

  admin_agent_control_requested: clientPlatform("An admin selected an agent control action.", ["targetType", "action"]),
  admin_crm_contact_created: clientPlatform("An admin attempted to create a CRM contact.", []),
  admin_crm_note_created: clientPlatform("An admin attempted to create a CRM note.", []),
  admin_crm_task_created: clientPlatform("An admin attempted to create a CRM task.", []),
  admin_crm_task_status_changed: clientPlatform("An admin attempted to change a CRM task status.", ["status"]),
  "admin.agent_control_requested": serverPlatform("An agent control request was durably accepted.", ["targetType", "action", "idempotent"]),
  "admin.crm_contact_created": serverPlatform("A CRM contact was durably created.", ["idempotent"]),
  "admin.crm_note_created": serverPlatform("A CRM note was durably created.", ["idempotent"]),
  "admin.crm_task_created": serverPlatform("A CRM task was durably created.", ["idempotent"]),
  "admin.crm_task_status_changed": serverPlatform("A CRM task status was durably changed.", ["status"]),
  ingestion_workbench_viewed: clientPlatform(
    "The ingestion workbench became visible.",
    ["run_count"],
    ["selected_run", "data_maturity"],
  ),
  ingestion_workbench_error: clientPlatform("The ingestion workbench encountered a recoverable error.", ["surface", "error_code"]),
  ingestion_run_selected: clientPlatform(
    "An ingestion run was selected.",
    ["source_id", "status"],
    ["quality_decision", "failure_code"],
  ),
  ingestion_run_filtered: clientPlatform("An ingestion filter changed.", ["filter_name", "filter_value"]),
  ingestion_run_evidence_viewed: clientPlatform(
    "An ingestion evidence record was opened.",
    ["section", "source_id"],
    ["run_status"],
  ),
  ingestion_shadow_run_requested: clientPlatform(
    "An admin requested one shadow run.",
    ["source_id", "request_result"],
    ["mode"],
  ),
  ingestion_shadow_batch_requested: clientPlatform(
    "An admin requested a shadow batch.",
    ["scope", "queued_count", "request_result"],
    ["lane"],
  ),
  "admin.ingestion_shadow_run_requested": serverPlatform("One shadow ingestion run was durably queued.", ["scope", "queued_count", "request_result"]),
  "admin.ingestion_shadow_batch_requested": serverPlatform("A shadow ingestion batch was durably queued.", ["scope", "queued_count", "request_result"]),
  organization_decision_email_batch_sent: serverOrganization("A decision-email batch completed.", ["sent", "failed"]),
  "organization.decision_email_batch_sent": serverOrganization("A decision-email batch completed.", ["sent", "failed"]),
} as const satisfies Record<string, AnalyticsEventDefinition>;

function clientGrowth(description: string, requiredProperties: readonly string[]): AnalyticsEventDefinition {
  return definition("client", "growth", description, requiredProperties, attributionProperties, 90);
}

function serverGrowth(description: string, requiredProperties: readonly string[], optionalProperties: readonly string[] = []): AnalyticsEventDefinition {
  return definition("server", "growth", description, requiredProperties, optionalProperties, 365);
}

function clientCreator(description: string, requiredProperties: readonly string[], optionalProperties: readonly string[] = []): AnalyticsEventDefinition {
  return definition("client", "creator-product", description, requiredProperties, optionalProperties, 180);
}

function serverCreator(description: string, requiredProperties: readonly string[], optionalProperties: readonly string[] = []): AnalyticsEventDefinition {
  return definition("server", "creator-product", description, requiredProperties, optionalProperties, 365);
}

function clientPlatform(
  description: string,
  requiredProperties: readonly string[],
  optionalProperties: readonly string[] = [],
): AnalyticsEventDefinition {
  return definition("client", "platform", description, requiredProperties, optionalProperties, 90);
}

function serverPlatform(description: string, requiredProperties: readonly string[]): AnalyticsEventDefinition {
  return definition("server", "platform", description, requiredProperties, [], 365);
}

function serverOrganization(description: string, requiredProperties: readonly string[]): AnalyticsEventDefinition {
  return definition("server", "organizations", description, requiredProperties, [], 365);
}

function definition(
  authority: AnalyticsAuthority,
  owner: AnalyticsEventDefinition["owner"],
  description: string,
  requiredProperties: readonly string[],
  optionalProperties: readonly string[],
  retentionDays: number,
): AnalyticsEventDefinition {
  return {
    authority,
    owner,
    description,
    purpose: description,
    requiredProperties,
    optionalProperties,
    retentionDays,
  };
}

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;
export const CLIENT_ANALYTICS_EVENT_NAMES = [
  "page_view",
  "public.discovery_view",
  "public.collection_view",
  "public.opportunity_view",
  "public.waitlist_cta_clicked",
  "public.waitlist_form_started",
  "public.waitlist_submit_attempted",
  "public.waitlist_join_failed",
  "opportunity_search_submitted",
  "opportunity_filter_changed",
  "opportunity_filters_cleared",
  "opportunity_taxonomy_selected",
  "opportunity_search_saved",
  "work_taxonomy_saved",
  "application.official_destination_opened",
  "admin_agent_control_requested",
  "admin_crm_contact_created",
  "admin_crm_note_created",
  "admin_crm_task_created",
  "admin_crm_task_status_changed",
  "ingestion_workbench_viewed",
  "ingestion_workbench_error",
  "ingestion_run_selected",
  "ingestion_run_filtered",
  "ingestion_run_evidence_viewed",
  "ingestion_shadow_run_requested",
  "ingestion_shadow_batch_requested",
] as const satisfies readonly AnalyticsEventName[];

export type ClientAnalyticsEventName = (typeof CLIENT_ANALYTICS_EVENT_NAMES)[number];

export const ANALYTICS_EVENT_NAMES = Object.freeze(Object.keys(ANALYTICS_EVENTS) as AnalyticsEventName[]);
export const SERVER_ANALYTICS_EVENT_NAMES = Object.freeze(
  ANALYTICS_EVENT_NAMES.filter((eventName) => ANALYTICS_EVENTS[eventName].authority === "server"),
);

const forbiddenPropertyPattern = /(?:email|phone|postal_address|display_name|full_name|first_name|last_name|document_text|filename|answer_text|prompt|content_body|token|secret|password|credential|receipt_number)/iu;

export function analyticsEventDefinition(eventName: string): AnalyticsEventDefinition | undefined {
  return ANALYTICS_EVENTS[eventName as AnalyticsEventName];
}

export function isAnalyticsEventName(eventName: string): eventName is AnalyticsEventName {
  return eventName in ANALYTICS_EVENTS;
}

export function validateAnalyticsProperties(properties: Record<string, unknown> | undefined): string | undefined {
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (forbiddenPropertyPattern.test(key)) return `Analytics property ${key} may contain private or sensitive content.`;
    if (value === undefined) continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      return `Analytics property ${key} must be a string, number, or boolean.`;
    }
    if (typeof value === "string" && value.length > 500) return `Analytics property ${key} is too long.`;
    if (typeof value === "number" && !Number.isFinite(value)) return `Analytics property ${key} must be finite.`;
  }
  return undefined;
}

export function validateAnalyticsEventProperties(eventName: AnalyticsEventName, properties: Record<string, unknown> | undefined): string | undefined {
  const propertyError = validateAnalyticsProperties(properties);
  if (propertyError) return propertyError;
  const definition = ANALYTICS_EVENTS[eventName];
  const allowed = new Set<string>([
    ...definition.requiredProperties,
    ...definition.optionalProperties,
  ]);
  const unknown = Object.keys(properties ?? {}).filter((key) => !allowed.has(key));
  if (unknown.length) {
    return `Analytics event ${eventName} contains unregistered properties: ${unknown.join(", ")}.`;
  }
  const missing = definition.requiredProperties.filter((key) => properties?.[key] === undefined);
  return missing.length ? `Analytics event ${eventName} is missing required properties: ${missing.join(", ")}.` : undefined;
}
