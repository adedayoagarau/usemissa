import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  auditEvents,
  memberships,
  opportunityPreferences,
  opportunityProfileLinks,
  opportunityProfileIdentityChecks,
  opportunities,
  opportunitySourceEvidence,
  opportunitySources,
  savedSearches,
  submissionOutboundEvents,
  sourceCoverageCells,
  sourceDiscoveryCandidates,
  sourceDiscoveryQueries,
  taxonomyExternalMappings,
  taxonomyTermRelations,
  taxonomyTerms,
  outboxEvents,
  reviewAssignments,
  trackedOpportunities,
  trackedStatusEvents,
  platformAgentControlRequests,
  platformBillingLedger,
  platformMessageAttempts,
  platformMessageEffects,
  platformCrmContacts,
  platformCrmTasks,
  platformAnalyticsEvents,
  opportunityContents,
  radarContentReviewJobs,
  radarContentReviewDecisions,
  chatConversations,
  chatRuns,
  chatMessages,
  chatRunEvents,
  trackerImportReceipts,
  trackerImportRateEvents,
  handles,
  handleAliases,
  waitlistInvites,
} from "../src/schema.js";

test("platform schema carries tenant, audit, outbox, and reviewer indexes", () => {
  const membershipConfig = getTableConfig(memberships);
  const auditConfig = getTableConfig(auditEvents);
  const outboxConfig = getTableConfig(outboxEvents);
  const assignmentConfig = getTableConfig(reviewAssignments);

  assert.ok(membershipConfig.primaryKeys.length === 1);
  assert.ok(
    auditConfig.indexes.some(
      (index) => index.config.name === "audit_events_org_created_idx",
    ),
  );
  assert.ok(
    outboxConfig.indexes.some(
      (index) => index.config.name === "outbox_events_pending_idx",
    ),
  );
  assert.ok(
    assignmentConfig.indexes.some(
      (index) => index.config.name === "review_assignments_unique_idx",
    ),
  );
});

test("taxonomy schema supports graph traversal, legacy mapping, and recurring source discovery", () => {
  const termConfig = getTableConfig(taxonomyTerms);
  const relationConfig = getTableConfig(taxonomyTermRelations);
  const mappingConfig = getTableConfig(taxonomyExternalMappings);
  const coverageConfig = getTableConfig(sourceCoverageCells);
  const queryConfig = getTableConfig(sourceDiscoveryQueries);
  const candidateConfig = getTableConfig(sourceDiscoveryCandidates);

  assert.ok(
    termConfig.indexes.some(
      (index) => index.config.name === "taxonomy_terms_facet_slug_idx",
    ),
  );
  assert.ok(
    relationConfig.indexes.some(
      (index) => index.config.name === "taxonomy_term_relations_object_idx",
    ),
  );
  assert.ok(
    mappingConfig.indexes.some(
      (index) => index.config.name === "taxonomy_external_mappings_lookup_idx",
    ),
  );
  assert.ok(
    coverageConfig.indexes.some(
      (index) => index.config.name === "source_coverage_cells_gap_idx",
    ),
  );
  assert.ok(
    queryConfig.indexes.some(
      (index) => index.config.name === "source_discovery_queries_due_idx",
    ),
  );
  assert.ok(
    candidateConfig.indexes.some(
      (index) => index.config.name === "source_discovery_candidates_review_idx",
    ),
  );
});

test("opportunities schema exposes the additive query and personal-state boundaries", () => {
  const opportunityConfig = getTableConfig(opportunities);
  const sourceConfig = getTableConfig(opportunitySources);
  const evidenceConfig = getTableConfig(opportunitySourceEvidence);
  const preferenceConfig = getTableConfig(opportunityPreferences);
  const savedSearchConfig = getTableConfig(savedSearches);
  const trackedConfig = getTableConfig(trackedOpportunities);
  const statusConfig = getTableConfig(trackedStatusEvents);
  const outboundConfig = getTableConfig(submissionOutboundEvents);

  assert.ok(
    opportunityConfig.indexes.some(
      (index) => index.config.name === "opportunities_public_deadline_idx",
    ),
  );
  assert.ok(
    sourceConfig.indexes.some(
      (index) => index.config.name === "opportunity_sources_active_idx",
    ),
  );
  assert.ok(
    sourceConfig.indexes.some(
      (index) => index.config.name === "opportunity_sources_trust_idx",
    ),
  );
  assert.ok(Object.values(sourceConfig.columns).some((column) => column.name === "trust_status"));
  assert.ok(Object.values(sourceConfig.columns).some((column) => column.name === "trust_score"));
  assert.ok(
    evidenceConfig.indexes.some(
      (index) => index.config.name === "opportunity_evidence_verified_idx",
    ),
  );
  assert.ok(
    Object.values(preferenceConfig.columns).some(
      (column) => column.name === "account_id" && column.primary,
    ),
  );
  assert.ok(
    savedSearchConfig.indexes.some(
      (index) => index.config.name === "saved_searches_account_idx",
    ),
  );
  assert.ok(
    trackedConfig.indexes.some(
      (index) => index.config.name === "tracked_opportunities_account_opp_idx",
    ),
  );
  assert.ok(
    statusConfig.indexes.some(
      (index) => index.config.name === "tracked_status_events_idempotency_idx",
    ),
  );
  assert.ok(
    outboundConfig.indexes.some(
      (index) => index.config.name === "submission_outbound_opp_idx",
    ),
  );
});

test("platform foundation schema separates effects, attempts, billing facts, and controls", () => {
  const effects = getTableConfig(platformMessageEffects);
  const attempts = getTableConfig(platformMessageAttempts);
  const billing = getTableConfig(platformBillingLedger);
  const controls = getTableConfig(platformAgentControlRequests);
  assert.ok(effects.indexes.some((index) => index.config.name === "platform_message_effects_tenant_idempotency_idx"));
  assert.ok(effects.columns.some((column) => column.name === "recipient_account_id"));
  assert.ok(effects.columns.some((column) => column.name === "template_version"));
  assert.ok(attempts.indexes.some((index) => index.config.name === "platform_message_attempts_effect_attempt_idx"));
  assert.ok(billing.indexes.some((index) => index.config.name === "platform_billing_ledger_provider_event_idx"));
  assert.ok(controls.indexes.some((index) => index.config.name === "platform_agent_control_requests_idempotency_idx"));
});

test("admin operations schema carries CRM ownership, follow-up, and analytics indexes", () => {
  const contacts = getTableConfig(platformCrmContacts);
  const tasks = getTableConfig(platformCrmTasks);
  const events = getTableConfig(platformAnalyticsEvents);
  assert.ok(contacts.indexes.some((index) => index.config.name === "platform_crm_contacts_org_idx"));
  assert.ok(tasks.indexes.some((index) => index.config.name === "platform_crm_tasks_org_due_idx"));
  assert.ok(events.indexes.some((index) => index.config.name === "platform_analytics_events_name_time_idx"));
});

test("opportunity intelligence keeps generated content and review history durable", () => {
  const content = getTableConfig(opportunityContents);
  const jobs = getTableConfig(radarContentReviewJobs);
  const decisions = getTableConfig(radarContentReviewDecisions);
  assert.ok(content.indexes.some((index) => index.config.name === "opportunity_contents_review_idx"));
  assert.ok(jobs.indexes.some((index) => index.config.name === "radar_content_review_jobs_ready_idx"));
  assert.ok(decisions.indexes.some((index) => index.config.name === "radar_content_review_decisions_opp_created_idx"));
  assert.ok(Object.values(decisions.columns).some((column) => column.name === "reviewer_account_id"));
  assert.ok(Object.values(decisions.columns).some((column) => column.name === "decision_source"));
});

test("chat schema separates conversation history, runs, messages, and events", () => {
  const conversations = getTableConfig(chatConversations);
  const runs = getTableConfig(chatRuns);
  const messages = getTableConfig(chatMessages);
  const events = getTableConfig(chatRunEvents);
  assert.ok(conversations.indexes.some((index) => index.config.name === "chat_conversations_account_updated_idx"));
  assert.ok(runs.indexes.some((index) => index.config.name === "chat_runs_account_idempotency_idx"));
  assert.ok(messages.indexes.some((index) => index.config.name === "chat_messages_run_idx"));
  assert.ok(events.indexes.some((index) => index.config.name === "chat_run_events_run_sequence_idx"));
  assert.ok(Object.values(runs.columns).some((column) => column.name === "graph_version"));
});

test("tracker import schema keeps replay receipts and distributed rate events durable", () => {
  const receipts = getTableConfig(trackerImportReceipts);
  const rateEvents = getTableConfig(trackerImportRateEvents);
  assert.ok(receipts.indexes.some((index) => index.config.name === "tracker_import_receipts_account_key_idx" && index.config.unique));
  assert.ok(receipts.indexes.some((index) => index.config.name === "tracker_import_receipts_user_created_idx"));
  assert.ok(rateEvents.indexes.some((index) => index.config.name === "tracker_import_rate_events_scope_idx"));
  assert.ok(rateEvents.checks.some((constraint) => constraint.name === "tracker_import_rate_events_kind_check"));
});

test("profile identity schema requires durable host and name evidence", () => {
  assert.deepEqual(opportunityProfileLinks.opportunityId.notNull, true);
  assert.deepEqual(opportunityProfileLinks.profileId.notNull, true);
  assert.deepEqual(opportunityProfileLinks.matchedHost.notNull, true);
  assert.deepEqual(opportunityProfileLinks.nameScore.notNull, true);
  assert.deepEqual(opportunityProfileLinks.evidence.notNull, true);
  assert.deepEqual(opportunityProfileIdentityChecks.nextCheckAt.notNull, true);
  assert.deepEqual(opportunityProfileIdentityChecks.evidence.notNull, true);
});

test("handle namespace keeps active subjects unique and aliases permanent", () => {
  const handleConfig = getTableConfig(handles);
  const aliasConfig = getTableConfig(handleAliases);

  assert.equal(
    handleConfig.columns.find((column) => column.name === "handle_key")?.primary,
    true,
  );
  assert.ok(
    handleConfig.indexes.some(
      (index) => index.config.name === "handles_subject_active_idx" && index.config.unique,
    ),
  );
  assert.ok(
    handleConfig.checks.some(
      (constraint) => constraint.name === "handles_subject_type_check",
    ),
  );
  assert.ok(
    handleConfig.checks.some(
      (constraint) => constraint.name === "handles_state_check",
    ),
  );
  assert.ok(
    handleConfig.checks.some(
      (constraint) => constraint.name === "handles_derivation_check",
    ),
  );
  assert.equal(
    handleConfig.foreignKeys.some(
      (foreignKey) => foreignKey.onDelete === "set null",
    ),
    true,
  );
  assert.equal(
    aliasConfig.columns.find((column) => column.name === "alias_key")?.primary,
    true,
  );
  assert.ok(
    aliasConfig.checks.some(
      (constraint) => constraint.name === "handle_aliases_reason_check",
    ),
  );
  assert.equal(
    aliasConfig.foreignKeys.some(
      (foreignKey) => foreignKey.onDelete === "cascade",
    ),
    true,
  );
});

test("waitlist invites keep hashed tokens unique and link to accounts safely", () => {
  const config = getTableConfig(waitlistInvites);
  assert.equal(
    config.columns.find((column) => column.name === "token_hash")?.notNull,
    true,
  );
  assert.ok(
    config.indexes.some(
      (index) => index.config.name === "waitlist_invites_token_hash_idx" && index.config.unique,
    ),
  );
  assert.ok(
    config.checks.some(
      (constraint) => constraint.name === "waitlist_invites_state_check",
    ),
  );
  assert.equal(
    config.foreignKeys.some(
      (foreignKey) => foreignKey.onDelete === "cascade",
    ),
    true,
  );
  assert.equal(
    config.foreignKeys.some(
      (foreignKey) => foreignKey.onDelete === "set null",
    ),
    true,
  );
});
