export * from './domain/types.js';
export { PROFILE_SOCIAL_SERVICES, PublicPortfolioValidationError, isPublicProfileIndexable, normalizePublicPortfolioPublishInput, type PublicPortfolioField } from './profile/publicPortfolio.js';
export { profileSampleKindForWork } from './profile/sample.js';
export {
  DEFAULT_PROFILE_NOTIFICATION_SETTINGS,
  profileNotificationSettings,
  updateProfileNotificationSettings,
} from './profile/notifications.js';
export {
  AccountDeletionBlockedError,
  accountDeletionBlockers,
  eraseCreatorAccount,
  creatorAccountAssetRefs,
  type AccountDeletionBlocker,
  type CreatorAccountErasureResult,
} from './profile/accountDeletion.js';
export * from './ports.js';
export * from './opportunityPorts.js';
export * from './content/opportunityContent.js';
export { DEFAULT_PROFILE_PRIVACY, RadarEngine, ProfilePrivacyValidationError, ProfileValidationError, type TickReport, type RadarStats, type RadarEngineOptions } from './engine.js';
export { createStore, cloneStore, loadStore, saveStore, changesFor, versionsFor, membershipKey, type RadarStore } from './store/store.js';
export { LibraryValidationError, LibraryConflictError, libraryForUser, libraryWorkReferences, libraryFileReferences, savedAnswerReferences, createLibraryWork, updateLibraryWork, deleteLibraryWork, createLibraryFile, deleteLibraryFile, createSavedAnswer, updateSavedAnswer, deleteSavedAnswer, type LibraryReferenceCounts } from './library/library.js';
export { CustomListValidationError, customListsForUser, customListMembershipsForUser, customListsForOpportunity, opportunitiesForCustomList, createCustomList, updateCustomList, deleteCustomList, addOpportunityToCustomList, removeOpportunityFromCustomList } from './lists/lists.js';
export { propsForUser, type UserProp } from './props/props.js';
export {
  ChecklistValidationError,
  opportunityChecklist,
  getOpportunityChecklist,
  checklistForUser,
  refreshOpportunityChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  normalizeChecklistKey,
  type ChecklistProgress,
  type OpportunityChecklistView,
  type ChecklistItemPatch,
} from './checklist/checklist.js';
export { FixtureFetcher, HttpFetcher, isSafeTextPayload, machineEvidenceText, stripHtml } from './ingestion/fetcher.js';
export { isDue, dueSources, nextCheckAt } from './ingestion/scheduler.js';
export { contentHash } from './ingestion/snapshot.js';
export { DeterministicExtractor } from './extraction/extractor.js';
export { taxonomyAssignmentsForPhrases } from './extraction/taxonomy.js';
export { validateCandidate, hasFatalIssues, looksLikeOpportunity } from './extraction/validate.js';
export { parseDate, daysBetween, addDays, isoDateOf, isPlausibleOpportunityDate } from './extraction/dates.js';
export { extractFee } from './extraction/fees.js';
export { OPENING_SIGNALS, CLOSING_SIGNALS, CLOSED_SIGNALS, SUSPICIOUS_SIGNALS, findSignals } from './extraction/signals.js';
export { findCanonical, titleSimilarity, normalizeName, type DedupMatch } from './dedup/dedup.js';
export {
  EMAIL_CANDIDATE_RETENTION_DAYS,
  EMAIL_MAX_BODY_CHARS,
  EMAIL_MAX_ENVELOPE_BYTES,
  createOrGetForwardingAddress,
  forwardingAddressView,
  rotateForwardingAddress,
  setForwardingAddressStatus,
  revokeForwardingAddress,
  ingestInboundEmail,
  listEmailCandidates,
  cleanupEmailCandidates,
  reviewEmailCandidate,
  verifyForwardingToken,
  EmailForwardingError,
  type ForwardingAddressView,
  type EmailReviewDecision,
  type EmailReviewMutation,
  type IngestResult,
} from './email/emailForwarding.js';
export {
  GMAIL_READONLY_SCOPE,
  GMAIL_DEFAULT_WINDOW_DAYS,
  encryptGmailRefreshToken,
  decryptGmailRefreshToken,
  createGmailOAuthState,
  consumeGmailOAuthState,
  createGmailConnection,
  queueGmailSyncJob,
  leaseGmailSyncJob,
  completeGmailSyncJob,
  failGmailSyncJob,
  cleanupGmailOAuthStates,
  setGmailMode,
  disconnectGmail,
  gmailAutopilotGate,
  ingestGmailEnvelope,
  gmailAccountLookupKey,
  type GmailOAuthConfig,
  type GmailTokenExchange,
  type GmailProviderPort,
  type AutopilotGate,
} from './gmail/gmailSync.js';
export { freshnessScore, confidenceScore, computeTrustSignals, trustScore, STALE_FRESHNESS_THRESHOLD } from './scoring/scores.js';
export { deriveStatus, displayStatus, CLOSING_SOON_DAYS, OPENING_SOON_DAYS, NEEDS_VERIFICATION_CONFIDENCE } from './status/statusEngine.js';
export { predictNextOpening, recordCycle } from './prediction/prediction.js';
export { matchesCriteria, matchesOpportunityPreferences, matchProfiles, type MatchResult } from './matching/matching.js';
export {
  assessCoverage,
  buildCoverageQueries,
  deduplicateCandidateUrls,
  summarizeTaxonomyMetrics,
  type CoverageAssessment,
  type CoverageCellInput,
  type CoverageMembershipInput,
  type DiscoveryQueryInput,
  type TaxonomyAssignmentMetricInput,
  type TaxonomyOperationalMetrics,
} from './coverage/coverage.js';
export { fitScore, formatFee } from './matching/fit.js';
export { buildInboxDigest, matchOrganizationByDomain, type InboxDigest } from './alerts/alerts.js';
export { verificationQueue } from './verification/verification.js';
export {
  isMyStatus,
  linkTrackedOpportunityToWork,
  deadlineReminders,
  overdueResponseAlerts,
  withdrawalSuggestionAlerts,
  REMINDER_DAYS,
  type TrackerView,
  type TrackerItem,
  type UserTrackerStats,
  type PipelineStage,
} from './tracker/tracker.js';
export { computeResponseStats, expectedResponseWindowDays, DEFAULT_RESPONSE_WINDOW_DAYS, type ResponseStats } from './tracker/responseStats.js';
export { RadarServer, type RadarServerOptions } from './server/server.js';
export { AuthError, DEFAULT_SEAT_LIMITS, membershipsFor, isOrgMember, organizationSeatLimit, organizationSeatUsage, provisionOrgAccount, revokeOrgMembership } from './auth/accounts.js';
export {
  hashPassword, verifyPassword, createSessionToken, verifySessionToken, type SessionPayload,
  createFeedToken, verifyFeedToken, type FeedTokenPayload,
} from './auth/crypto.js';
export { buildIcsFeed } from './tracker/calendarFeed.js';
export {
  TRACKER_IMPORT_MAX_BYTES,
  TRACKER_IMPORT_MAX_ROWS,
  TRACKER_IMPORT_MAX_COLUMNS,
  TRACKER_IMPORT_MAX_CELL_CHARS,
  TRACKER_IMPORT_MAX_PROCESSING_MS,
  TRACKER_IMPORT_FIELDS,
  TrackerImportError,
  parseTrackerCsv,
  detectTrackerImportMapping,
  validateTrackerImportMapping,
  normalizeImportedStatus,
  normalizeImportedDate,
  planTrackerImport,
  commitTrackerImport,
  type ImportField,
  type ImportMapping,
  type ImportDecision,
  type ImportTaxonomyDecision,
  type ImportRowDecision,
  type ParsedTrackerCsv,
  type TrackerImportPlan,
  type TrackerImportPlanRow,
  type TrackerImportTaxonomyReview,
  type TrackerImportResult,
} from './import/trackerImport.js';
export { buildServerDemoWorld, type ServerDemoWorld, type DemoCredential } from './fixtures/serverDemo.js';
export { buildDemoWorld, ManualClock } from './fixtures/seed.js';
export {
  DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD,
  HANDLE_COMPACT_MAX_LENGTH,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  deriveDirectoryHandleCandidates,
  deriveDomainHandleCandidates,
  deriveNameHandleCandidates,
  inspectHandleNormalization,
  normalizeHandle,
  planDirectoryProfileMerge,
  planDirectoryReservation,
  proposeIdentityConfidenceThreshold,
  registrableDomainLabel,
  AUTHORITY_RESERVED_HANDLE_WORDS,
  COMMON_ENGLISH_HANDLE_WORDS,
  COMMON_ENGLISH_HANDLE_WORD_SET,
  RESERVED_HANDLE_WORDS,
  ROUTE_RESERVED_HANDLE_WORDS,
  type DirectoryHandleDerivation,
  type DirectoryProfileInput,
  type DirectoryProfileMergePlan,
  type DirectoryReservationPlan,
  type DirectoryReservationPlanContext,
  type HandleCandidateSet,
  type HandleNormalization,
  type HandleNormalizationReason,
} from './handles/handles.js';
export {
  HANDLE_CLAIM_ACCESS_MODE,
  HANDLE_CLAIM_INVITEE_WINDOW_DAYS,
  HANDLE_DELETION_HOLD_DAYS,
  HANDLE_MEANINGFUL_TRAFFIC_PAGEVIEWS,
  HANDLE_RENAME_INTERVAL_DAYS,
  HANDLE_TRAFFIC_WINDOW_DAYS,
  handleReleaseDecision,
  inviteeClaimWindowOpen,
  renameAllowed,
  type HandleClaimAccessMode,
} from './handles/policy.js';
export {
  REGISTRY_VERTICALS,
  assembleRegistry,
  getRegistry,
  getVertical,
  getVerticalsByGroup,
  filterSources,
  registryStats,
  loadSourcesIntoEngine,
  toRadarSources,
  discoverySeeds,
  canonicalSources,
  auditRegistryTaxonomy,
  buildRegistryCoverage,
  defaultSourceTrust,
  registryTaxonomyTermIds,
  registryVerticalCompatibility,
  trustedSource,
} from './registry/index.js';
export type {
  SourceTier,
  VerticalGroup,
  RegistryVertical,
  SourceRegistryEntry,
  SourceRegistry,
  RegistryStats,
  LoadRegistryOptions,
  SourceTrust,
  SourceTrustStatus,
  SourceAuthorityKind,
  RegistryCoverageStatus,
  RegistryTermCoverage,
  RegistryFacetCoverage,
  RegistryCoverageSummary,
} from './registry/types.js';
export type { RegistryTaxonomyAudit, RegistryVerticalCompatibility } from './registry/taxonomy.js';
