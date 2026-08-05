import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  auditEvents,
  memberships,
  opportunityPreferences,
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
  assert.ok(effects.indexes.some((index) => index.config.name === "platform_message_effects_idempotency_idx"));
  assert.ok(attempts.indexes.some((index) => index.config.name === "platform_message_attempts_effect_attempt_idx"));
  assert.ok(billing.indexes.some((index) => index.config.name === "platform_billing_ledger_provider_event_idx"));
  assert.ok(controls.indexes.some((index) => index.config.name === "platform_agent_control_requests_idempotency_idx"));
});
