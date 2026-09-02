import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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
  organizationFollows,
  platformAgentControlRequests,
  platformBillingLedger,
  platformBillingActions,
  platformBillingActionOutcomes,
  platformBillingProviderEventOutcomes,
  platformEntitlementAdjustments,
  platformAgentControlOutcomes,
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
  decisions,
  deliveryTasks,
  workspaceCommandReceipts,
  submissions,
  creatorProfiles,
  creatorProfileMotionEvents,
  creatorInboxAlerts,
  notificationPreferences,
  calendarFeedTokens,
  creatorLibraryWorks,
  creatorLibraryFiles,
  creatorSavedAnswers,
  trackerManualEntries,
  trackerLists,
  trackerListMemberships,
  trackerChecklists,
  trackerChecklistItems,
  garyProfileVisuals,
  garyPrizeProvenance,
  garyProfileIntelligence,
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
  assert.ok(controls.indexes.some((index) => index.config.name === "platform_agent_control_requests_domain_idempotency_idx"));
});

test("governed operations separate provider facts, action queues, outcomes, and entitlements", () => {
  const actions = getTableConfig(platformBillingActions);
  const billingOutcomes = getTableConfig(platformBillingActionOutcomes);
  const providerOutcomes = getTableConfig(platformBillingProviderEventOutcomes);
  const entitlements = getTableConfig(platformEntitlementAdjustments);
  const agentOutcomes = getTableConfig(platformAgentControlOutcomes);
  assert.ok(actions.indexes.some((index) => index.config.name === "platform_billing_actions_org_idempotency_idx" && index.config.unique));
  assert.ok(actions.columns.some((column) => column.name === "confirmation_digest"));
  assert.ok(actions.columns.some((column) => column.name === "provider_idempotency_key"));
  assert.ok(billingOutcomes.foreignKeys.some((key) => key.onDelete === "restrict"));
  assert.ok(providerOutcomes.foreignKeys.some((key) => key.onDelete === "restrict"));
  assert.ok(getTableConfig(platformBillingLedger).columns.some((column) => column.name === "receipt_digest"));
  assert.ok(entitlements.indexes.some((index) => index.config.name === "platform_entitlement_adjustments_action_idx" && index.config.unique));
  assert.ok(agentOutcomes.columns.some((column) => column.name === "checkpoint_acknowledged"));
  const oneChild = agentOutcomes.indexes.find((index) => index.config.name === "platform_agent_control_one_child_idx");
  assert.ok(oneChild?.config.unique);
  const whereChunks = (oneChild?.config.where as { queryChunks?: Array<{ name?: string; value?: string[] }> } | undefined)?.queryChunks ?? [];
  assert.ok(whereChunks.some((chunk) => chunk.name === "child_run_id"));
  assert.ok(whereChunks.some((chunk) => chunk.value?.join("").includes("is not null")));
});

test("governed CRM migration refuses ambiguous legacy subject ownership", () => {
  const migration = readFileSync("migrations/0029_governed_operations.sql", "utf8");
  for (const table of ["platform_crm_timeline_events", "platform_crm_contacts", "platform_crm_tasks"]) {
    assert.match(migration, new RegExp(`SELECT 1 FROM "${table}"[\\s\\S]*?<> 1[\\s\\S]*?RAISE EXCEPTION '0029 preflight: ${table}`));
  }
  assert.doesNotMatch(migration, /SET "account_id" = NULL WHERE "organization_id" IS NOT NULL AND "account_id" IS NOT NULL/);
});

test("migration journal retains the reconciled operational chain", () => {
  const journal = JSON.parse(
    readFileSync("migrations/meta/_journal.json", "utf8"),
  ) as { entries: Array<{ idx: number; when: number; tag: string }> };
  const tags = journal.entries.map((entry) => entry.tag);
  const required = [
    "0003_submission_payments",
    "0004_open_call_guidelines",
    "0005_submission_answers",
    "0006_submission_idempotency",
    "0007_submission_drafts",
    "0008_submission_draft_payment",
    "0009_work_file_urls",
    "0010_reconcile_submission_drafts",
    "0011_taxonomy_graph",
    "0012_activate_missa_taxonomy",
    "0013_radar_agent_heartbeat",
    "0024_radar_source_runs",
    "0028_durable_message_effect_ledger",
    "0029_governed_operations",
    "0030_workspace_relational_authority",
    "0031_creator_relational_authority",
    "0032_opportunity_availability",
    "0033_aggregate_record_publication_guard",
  ];
  for (const tag of required) assert.ok(tags.includes(tag), `${tag} is journaled`);
  assert.deepEqual(
    journal.entries.map((entry) => entry.idx),
    journal.entries.map((_, index) => index),
  );
  assert.ok(
    journal.entries.every(
      (entry, index) => index === 0 || entry.when > journal.entries[index - 1]!.when,
    ),
  );
  assert.ok(tags.indexOf("0013_radar_agent_heartbeat") < tags.indexOf("0015_admin_operations"));
  assert.ok(tags.indexOf("0024_radar_source_runs") < tags.indexOf("0025_publication_gate_defaults"));
});

test("workspace relational authority has revisions and scoped command receipts", () => {
  const decision = getTableConfig(decisions);
  const delivery = getTableConfig(deliveryTasks);
  const receipts = getTableConfig(workspaceCommandReceipts);
  const submission = getTableConfig(submissions);
  assert.ok(decision.columns.some((column) => column.name === 'revision'));
  assert.ok(decision.indexes.some((index) => index.config.name === 'decisions_work_idx' && index.config.unique));
  assert.ok(delivery.columns.some((column) => column.name === 'revision'));
  assert.ok(receipts.indexes.some((index) => index.config.name === 'workspace_command_receipts_identity_idx' && index.config.unique));
  for (const column of ['answers', 'category', 'idempotency_key', 'payment_status', 'payment_session_id', 'fee_cents', 'revision']) {
    assert.ok(submission.columns.some((candidate) => candidate.name === column), `submissions retains ${column}`);
  }
  assert.ok(submission.indexes.some((index) => index.config.name === 'submissions_payment_session_idx' && index.config.unique));
  const migration = readFileSync('migrations/0030_workspace_relational_authority.sql','utf8');
  assert.match(migration,/workspace_command_receipts/);
  assert.match(migration,/outbox_events_event_key_idx/);
  assert.match(migration,/review_assignments.*updated_at/s);
  assert.match(migration,/submissions_payment_status_check/);
  assert.match(migration,/submissions_fee_check/);
  assert.match(migration,/submissions_payment_session_idx/);
  for (const table of ['entities','programs','open_calls','submission_paths','submissions','works','review_rounds','review_assignments','decisions','delivery_tasks']) {
    assert.match(migration, new RegExp(`${table}_revision_check`), `${table} enforces revision >= 1`);
  }
  assert.doesNotMatch(migration,/DROP TABLE|TRUNCATE|DROP COLUMN/i);
  assert.doesNotMatch(migration,/"revision" integer[^,\n]*CHECK \("revision" >= 1\)/, "revision checks are added once with explicit names");
});

test("target schema replay includes the complete registered tail through workspace authority", () => {
  const targetSchema = readFileSync("../../scripts/apply-target-schema.mjs", "utf8");
  const requiredTail = [
    "0018_trusted_source_registry.sql",
    "0019_radar_ingestion_reliability.sql",
    "0020_waitlist_signups.sql",
    "0021_tracker_import_transactions.sql",
    "0022_resend_webhook_events.sql",
    "0023_profile_opportunity_identity.sql",
    "0024_radar_source_runs.sql",
    "0025_publication_gate_defaults.sql",
    "0026_handle_namespace.sql",
    "0027_waitlist_invites.sql",
    "0028_durable_message_effect_ledger.sql",
    "0029_governed_operations.sql",
    "0030_workspace_relational_authority.sql",
    "0031_creator_relational_authority.sql",
    "0032_opportunity_availability.sql",
    "0033_aggregate_record_publication_guard.sql",
  ];
  let previous = -1;
  for (const migration of requiredTail) {
    const position = targetSchema.indexOf(`'${migration}'`);
    assert.ok(position > previous, `${migration} is replayed in dependency order`);
    previous = position;
  }
});

test("opportunity availability migration queues stale claims before restoring the deferred publication gate", () => {
  const migration = readFileSync("migrations/0032_opportunity_availability.sql", "utf8");
  const dropTrigger = migration.indexOf("DROP TRIGGER IF EXISTS missa_publication_gate_trigger");
  const queueSeed = migration.indexOf("INSERT INTO \"opportunity_lifecycle_verification_jobs\"");
  const recreateTrigger = migration.indexOf("CREATE CONSTRAINT TRIGGER missa_publication_gate_trigger");
  assert.ok(dropTrigger >= 0 && dropTrigger < queueSeed);
  assert.ok(queueSeed < recreateTrigger);
  assert.doesNotMatch(migration, /UPDATE "opportunities"\s+SET\s+"status" = 'uncertain'/s);
  assert.match(migration, /CASE WHEN "publication_state" = 'published' THEN 100 ELSE 10 END/);
  assert.match(migration, /"open_date" IS NULL OR "open_date" <= current_date/);
  assert.match(migration, /NEW\.deadline_date >= current_date/);
});

test("creator relational authority normalizes every owner-scoped launch aggregate", () => {
  const ownerTables = [
    creatorProfiles,
    creatorProfileMotionEvents,
    creatorInboxAlerts,
    notificationPreferences,
    calendarFeedTokens,
    creatorLibraryWorks,
    creatorLibraryFiles,
    creatorSavedAnswers,
    trackerManualEntries,
    trackerLists,
    trackerChecklists,
    trackerChecklistItems,
  ];
  for (const table of ownerTables) {
    const config = getTableConfig(table);
    assert.ok(config.columns.some((column) => column.name === "account_id"), `${config.name} is account-owned`);
    assert.ok(config.columns.some((column) => column.name === "revision"), `${config.name} has optimistic concurrency`);
    assert.ok(config.checks.some((constraint) => constraint.name.endsWith("_revision_check")), `${config.name} enforces revision >= 1`);
  }
  const memberships = getTableConfig(trackerListMemberships);
  assert.ok(memberships.columns.some((column) => column.name === "account_id"));
  assert.ok(memberships.indexes.some((index) => index.config.name === "tracker_list_memberships_identity_idx" && index.config.unique));
  assert.ok(getTableConfig(creatorInboxAlerts).indexes.some((index) => index.config.name === "creator_inbox_alerts_dedupe_idx" && index.config.unique));
  assert.ok(getTableConfig(calendarFeedTokens).indexes.some((index) => index.config.name === "calendar_feed_tokens_hash_idx" && index.config.unique));
  assert.ok(getTableConfig(notificationPreferences).checks.some((constraint) => constraint.name === "notification_preferences_digest_check"));
  const listColumns = new Set(getTableConfig(trackerLists).columns.map((column) => column.name));
  for (const field of ["description", "color_token", "archived_at"]) {
    assert.ok(listColumns.has(field), `tracker_lists preserves ${field}`);
  }
  const checklistColumns = new Set(getTableConfig(trackerChecklists).columns.map((column) => column.name));
  for (const field of ["tracked_at", "source_version"]) assert.ok(checklistColumns.has(field), `tracker_checklists preserves ${field}`);
  const checklistItemColumns = new Set(getTableConfig(trackerChecklistItems).columns.map((column) => column.name));
  for (const field of ["normalized_key", "position", "state", "source", "source_confidence"]) {
    assert.ok(checklistItemColumns.has(field), `tracker_checklist_items preserves ${field}`);
  }

  for (const table of [opportunityPreferences, savedSearches, trackedOpportunities, organizationFollows]) {
    assert.ok(getTableConfig(table).columns.some((column) => column.name === "revision"));
  }
  const migration = readFileSync("migrations/0031_creator_relational_authority.sql", "utf8");
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DROP COLUMN/i);
  assert.match(migration, /creator_inbox_alerts_dedupe_idx/);
  assert.match(migration, /calendar_feed_tokens_hash_idx/);
  assert.match(migration, /radar_accounts_auth_identity_idx/);
  assert.match(migration, /data->>'authProvider'/);
  assert.match(migration, /workspace_command_receipts/);
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

test("creative preparation backfill schema defines visuals, prize provenance, and intelligence", () => {
  const visualsConfig = getTableConfig(garyProfileVisuals);
  assert.ok(
    visualsConfig.indexes.some(
      (index) => index.config.name === "gary_profile_visuals_profile_idx",
    ),
  );
  assert.ok(
    visualsConfig.checks.some(
      (constraint) => constraint.name === "gary_profile_visuals_asset_type_check",
    ),
  );

  const prizeConfig = getTableConfig(garyPrizeProvenance);
  assert.ok(
    prizeConfig.indexes.some(
      (index) => index.config.name === "gary_prize_provenance_profile_idx",
    ),
  );
  assert.equal(
    prizeConfig.columns.find((c) => c.name === "winner_name")?.notNull,
    true,
  );

  const intelConfig = getTableConfig(garyProfileIntelligence);
  assert.equal(
    intelConfig.columns.find((c) => c.name === "profile_id")?.primary,
    true,
  );
  assert.equal(
    intelConfig.columns.find((c) => c.name === "prestige_tier")?.notNull,
    true,
  );
  assert.equal(
    intelConfig.columns.find((c) => c.name === "editorial_archetype")?.notNull,
    true,
  );
});

