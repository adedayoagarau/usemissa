/**
 * PlaywrightFetcher is deliberately NOT re-exported here (import it directly
 * from './playwrightFetcher.js' if you need it). `playwright`'s own
 * module-load code reaches for browser-registry files that don't exist in a
 * serverless bundle -- a *static* import/re-export runs that code the moment
 * this barrel loads, which crashed every route that imports anything from
 * this package (createProductionEngine included), not just actual Playwright
 * usage. See productionEngine.ts's dynamic import for the same reasoning.
 */
export { LlmExtractor, type LlmExtractorOptions } from "./llmExtractor.js";
export * from "./governedOperations.js";
export {
  classifyLifecycleEvidence,
  runLifecycleReconcilerBatch,
  LIFECYCLE_CLASSIFIER_VERSION,
} from "./lifecycleReconciler.js";
export type {
  LifecycleDecision,
  LifecycleFetchResult,
  LifecycleReconcilerOptions,
} from "./lifecycleReconciler.js";
export {
  ensurePostgresSchema,
  saveStoreToPostgres,
  loadStoreFromPostgres,
  readSnapshotVersion,
  saveRadarStoreDeltaToPostgres,
  SnapshotConflictError,
} from "./postgresStore.js";
export { uuidIds } from "./uuidIds.js";
export { canonicalOpportunityIsPublic, canonicalPublicOpportunityPredicate } from "./canonicalOpportunityProjection.js";
export {
  creatorRelationalAuthorityEnabled,
  creatorRelationalAuthorityHealth,
  type CreatorAuthorityEnvironment,
  type CreatorAuthorityHealth,
} from "./creatorAuthority.js";
export {
  boundedCreatorReceipt,
  canonicalCreatorRequestHash,
  creatorCommandEnvelope,
  creatorPoolFor,
  CreatorCommandValidationError,
  CreatorConflictError,
  CreatorIdempotencyConflictError,
  CreatorRepositoryBase,
  type CreatorCommandEnvelope,
  type CreatorAggregateCommand,
  type CreatorAggregateKind,
  type CreatorAggregateView,
  type CreatorRepositoryPort,
  type CreatorReceipt,
} from "./creatorRepository.js";
export {
  normalizeCreatorProfileInput,
  normalizeCreatorPrivacyInput,
  PostgresCreatorProfileRepository,
  type CreatorProfileInput,
  type CreatorProfileView,
  type CreatorPrivacyInput,
} from "./creatorProfileRepository.js";
export {
  CreatorAccountProvisionError,
  PostgresCreatorAccountRepository,
} from "./creatorAccountRepository.js";
export {
  PostgresCreatorPreferenceRepository,
  type CreatorFollowView,
  type CreatorPreferenceBundle,
  type CreatorSavedSearchView,
} from "./creatorPreferenceRepository.js";
export {
  PostgresCreatorTrackerRepository,
  type CreatorTrackerList,
  type CreatorTrackerListMembership,
} from "./creatorTrackerRepository.js";
export {
  PostgresCreatorInboxRepository,
  type CreatorInboxAlertView,
} from "./creatorInboxRepository.js";
export {
  PostgresCreatorNotificationRepository,
  type CreatorNotificationPreferences,
  type NotificationDigestCadence,
} from "./creatorNotificationRepository.js";
export {
  CreatorEmailReviewError,
  PostgresCreatorEmailReviewRepository,
  type CreatorEmailCandidateView,
  type CreatorEmailReviewResult,
} from "./creatorEmailReviewRepository.js";
export {
  CreatorLibraryConflictError,
  CreatorLibraryValidationError,
  PostgresCreatorLibraryRepository,
  type CreatorLibraryFile,
  type CreatorLibraryView,
  type CreatorLibraryWork,
  type CreatorSavedAnswer,
  type CreatorWorkConnections,
} from "./creatorLibraryRepository.js";
export {
  CreatorCalendarError,
  PostgresCreatorCalendarRepository,
  type CreatorCalendarItem,
  type CreatorCalendarEvent,
  type CreatorCalendarTokenResult,
  type CreatorCalendarTokenState,
  type CalendarConnectionView,
  type CalendarProvider,
  type CalendarSyncLease,
} from "./creatorCalendarRepository.js";
export {
  encryptCalendarCredential,
  decryptCalendarCredential,
} from "./calendarCredentialCrypto.js";
export { loadCanonicalTrackerImportStore } from "./canonicalTrackerImport.js";
export {
  createProductionEngine,
  seedRegistryIfEmpty,
  type ProductionEngine,
} from "./productionEngine.js";
export {
  PostgresOpportunityRepository,
  createPostgresOpportunityRepository,
  createPostgresOpportunityRepositoryFromUrl,
  buildOpportunityBrowseQuery,
  buildOpportunityFacetCountsQuery,
  type SqlQuery,
} from "./opportunityRepository.js";
export * from "./recommendation/index.js";
export { saveOpportunityProjectionToPostgres } from "./opportunityRelationalStore.js";
export {
  canonicalTrackerStatus,
  listCanonicalTrackedOpportunities,
  saveCanonicalOpportunityToTracker,
  removeCanonicalTrackedOpportunity,
  updateCanonicalTrackerReminder,
  updateCanonicalTrackerStatus,
  type CanonicalTrackerSave,
  type CanonicalTrackerItem,
  type CanonicalTrackerStatus,
  type CanonicalTrackerStatusUpdate,
  type CanonicalTrackerReminderUpdate,
  type CanonicalTrackerRemoval,
} from "./canonicalTracker.js";
export {
  PostgresProfileRepository,
  createPostgresProfileRepositoryFromUrl,
  getSemanticUrlForProfile,
  type ProfileBrowsePage,
  type ProfileBrowseQuery,
  type ProfileCard,
  type ProfileDetail,
  type ProfileKind,
  type ProfileMedia,
  type ProfileOpportunity,
  type ProfileRepository,
} from "./profileRepository.js";
export {
  PROFILE_IDENTITY_MATCHER_VERSION,
  matchOpportunityToProfiles,
  normalizeHost,
  profileNameEvidence,
  profileLinkRetirementStatement,
  syncProfileOpportunityLinks,
  type OpportunityIdentityInput,
  type ProfileIdentityDecision,
  type ProfileUrlEvidence,
} from "./profileIdentityMatcher.js";
export {
  commitTrackerImportTransaction,
  commitRelationalTrackerImportTransaction,
  consumeTrackerImportPreviewRateLimit,
  trackerImportCandidateHash,
  trackerImportRequestHash,
  trackerImportStateHash,
  TrackerImportPersistenceError,
  type DurableTrackerImportInput,
  type DurableTrackerImportResult,
  type RelationalTrackerImportInput,
  type TrackerImportPersistenceErrorCode,
} from "./trackerImportPersistence.js";
export {
  ensureEnrichmentSchema,
  enrichmentSchema,
} from "./enrichmentSchema.js";
export {
  ensureAgentGraphSchema,
  agentGraphSchema,
} from "./agentGraphSchema.js";
export {
  ensureContentReviewSchema,
  contentReviewSchema,
} from "./contentReviewSchema.js";
export {
  ensurePublicationRubricSchema,
  publicationRubricSchema,
} from "./publicationRubricSchema.js";
export {
  evaluatePublicationRubric,
  type PublicationRubricCandidate,
  type PublicationRubricResult,
} from "./publicationRubric.js";
export {
  CHAT_BASELINE_GRAPH_VERSION,
  PostgresChatStore,
  createPostgresChatStore,
  createPostgresChatStoreFromUrl,
  type BeginChatTurnInput,
  type BeginChatTurnResult,
  type ChatConversationRecord,
  type ChatConversationView,
  type ChatMessageRecord,
  type ChatMessageRole,
  type ChatRunRecord,
  type ChatRunStatus,
  type ChatRunView,
} from "./chatPersistence.js";
export {
  readContentReviewQueue,
  resolveContentReview,
  emptyContentReviewQueue,
  type ContentReviewQueueData,
  type ContentReviewQueueRow,
  type HumanContentReviewDecision,
} from "./contentReviewAdmin.js";
export {
  classifyPublicationCandidate,
  publicationReviewMembershipHash,
  readPublicationReviewPreview,
  type PublicationReviewLane,
  type PublicationReviewPreview,
  type PublicationReviewRow,
} from "./publicationReview.js";
export {
  RADAR_AGENT_GRAPH,
  agentGraphSnapshot,
  type RadarAgentKind,
} from "./agentGraph.js";
export {
  FREE_MAIL_DOMAINS,
  generateInviteToken,
  hashInviteToken,
  isFreeMailDomain,
  orderWaitlistSignups,
  prepareWaitlistInvites,
  previewWaitlistInviteCandidates,
  readWaitlistPublicationMatchReport,
  redeemWaitlistInvite,
  revokeWaitlistInvite,
  sendWaitlistInvites,
  waitlistClaimAccess,
  type InviteRedemptionResult,
  type InviteRedemptionState,
  type PreparedWaitlistInvite,
  type WaitlistInviteDeliveryResult,
  type WaitlistInviteSignup,
  type WaitlistPublicationMatch,
  type WaitlistPublicationMatchReport,
} from "./waitlistInvites.js";
export {
  HANDLE_CLAIM_WINDOW_MESSAGE,
  HANDLE_RENAME_TOO_SOON_MESSAGE,
  HANDLE_UNAVAILABLE_MESSAGE,
  PUBLICATION_CLAIM_HOLD_MESSAGE,
  applyDeletedUserHandlePolicy,
  claimUserHandle,
  handleNamespaceAvailable,
  handleClaimAccessMode,
  normalizeUserHandleInput,
  readUserHandle,
  renameUserHandle,
  resolveHandle,
  HandleNamespaceUnavailableError,
  type HandleClaimResult,
  type HandleClaimState,
  type HandleRenameResult,
  type HandleRenameState,
  type DeletedUserHandlePolicyState,
  type ResolvedHandle,
  type UserHandle,
} from "./handleNamespace.js";
export {
  runReviewTick,
  reviewCandidate,
  type ReviewCandidate,
} from "./reviewWorker.js";
export { runContentReviewTick } from "./contentWorker.js";
export {
  GRANTS_GOV_API_ENDPOINT,
  fetchMachineDiscoverySource,
  grantsGovLinksFromResponse,
  grantsGovSearchRequest,
  isMachineDiscoveryAdapter,
  type MachineDiscoveryResult,
} from "./machineDiscoveryAdapters.js";
export {
  runDiscoveryWorker,
  runDiscoveryWorkerTick,
  extractDiscoveryLinks,
  discoveryBatchSize,
  discoveryPolicyFromRobots,
  discoveryRequestHeaders,
  reconcileMachineDiscoveredChildren,
  discoverySourceFromLink,
  mergeDiscoveredSourceMetadata,
  type DiscoveryWorkerOptions,
  type DiscoveryTickResult,
} from "./discoveryWorker.js";
export {
  discoverSourceLinks,
  type DiscoveredSourceLink,
} from "./sourceDiscoveryAdapters.js";
export {
  runSourcePromotionWorker,
  runSourcePromotionWorkerTick,
  sourcePromotionBatchSize,
  sourcePromotionConcurrency,
  verifySourceCandidate,
  type SourcePromotionWorkerOptions,
  type SourcePromotionTickResult,
  type SourceVerificationEvidence,
  type SourceVerificationResult,
} from "./sourcePromotionWorker.js";
export {
  runCoverageWorkerTick,
  materializeCoverageCells,
  assessCoverageCells,
  enqueueCoverageQueries,
  type CoverageWorkerOptions,
  type CoverageTickResult,
} from "./coverageWorker.js";
export {
  HttpTaxonomySearchProvider,
  SerperTaxonomySearchProvider,
  taxonomySearchProviderFromEnv,
  taxonomyDiscoveryBatchSize,
  taxonomyDiscoveryResultLimit,
  parseTaxonomySearchResponse,
  runTaxonomyDiscoveryWorker,
  runTaxonomyDiscoveryWorkerTick,
  type TaxonomyDiscoveryWorkerOptions,
  type TaxonomyDiscoveryTickResult,
  type TaxonomySearchProvider,
  type TaxonomySearchResponse,
  type TaxonomySearchResult,
} from "./taxonomyDiscoveryWorker.js";
export {
  readTaxonomyAdminDashboard,
  createTaxonomyChangeProposal,
  reviewTaxonomyChangeProposal,
  TAXONOMY_REVIEW_STATUSES,
  type TaxonomyAdminDashboard,
  type TaxonomyProposalReviewResult,
  type TaxonomyReviewStatus,
} from "./taxonomyAdmin.js";
export {
  readPlatformAdminDurableSummary,
  type DurableAgentRunRow,
  type DurableAuditRow,
  type DurableHandoffRow,
  type DurableJobRow,
  type DurableMaturity,
  type DurableOutboxRow,
  type DurableQueueMetric,
  type PlatformAdminDurableSummary,
} from "./platformAdmin.js";
export {
  finishWorkerRun,
  heartbeatWorkerRun,
  readWorkerRunLifecycle,
  startWorkerRun,
  type RadarWorkerKind,
  type WorkerRunLifecycleStatus,
  type WorkerRunProgress,
} from "./workerTelemetry.js";
export {
  recordPlatformAdminAudit,
  mutatePlatformAdminQueue,
  type PlatformAdminQueue,
  type PlatformAdminQueueAction,
  type PlatformAdminQueueMutation,
  type PlatformAdminQueueMutationResult,
} from "./platformAdminOperations.js";
export {
  createOpportunityIssueReport,
  normalizePlatformAdminSupportCase,
  readPlatformAdminSupportQueue,
  summarizePlatformAdminSupportCases,
  updatePlatformAdminSupportCase,
  PLATFORM_SUPPORT_STATUSES,
  type CreateOpportunityIssueReportInput,
  type CreateOpportunityIssueReportResult,
  type PlatformAdminSupportCase,
  type PlatformAdminSupportQueue,
  type PlatformAdminSupportSummary,
  type PlatformSupportStatus,
  type UpdatePlatformAdminSupportCaseInput,
  type UpdatePlatformAdminSupportCaseResult,
} from "./platformAdminSupport.js";
export {
  beginPlatformMessageEffect,
  completePlatformMessageEffect,
  providerEventEffectStatus,
  recordPlatformMessageProviderEvent,
  createPlatformCrmContact,
  createPlatformCrmNote,
  createPlatformCrmTask,
  ensurePlatformAdminFoundationsSchema,
  readPlatformAdminAnalyticsEvents,
  readPlatformAdminAgentControls,
  readPlatformAdminBilling,
  readPlatformAdminCrm,
  readPlatformAdminMessageHistory,
  readOrganizationMessageHistory,
  processPlatformAgentControlRequests,
  recordPlatformBillingEvent,
  recordPlatformAnalyticsEvent,
  requestPlatformAgentControl,
  platformAdminFoundationsSchema,
  PLATFORM_AGENT_CONTROL_ACTIONS,
  billingEventType,
  type BeginPlatformMessageEffectInput,
  type BeginPlatformMessageEffectResult,
  type PlatformAdminAgentControlsData,
  type PlatformAdminAnalyticsEventsData,
  type PlatformAdminBillingData,
  type PlatformAdminCrmData,
  type PlatformAdminMessageHistory,
  type PlatformAgentControlProcessingResult,
  type PlatformAgentControlAction,
  type PlatformAgentControlRequest,
  type PlatformAgentTargetType,
  type PlatformBillingEntryType,
  type PlatformBillingLedgerEntry,
  type PlatformBillingStatus,
  type PlatformCrmTimelineEvent,
  type PlatformCrmContact,
  type PlatformCrmTask,
  type PlatformAgentRunRow,
  type PlatformMessageAttempt,
  type PlatformMessageEffect,
  type PlatformMessageEffectStatus,
  updatePlatformCrmTaskStatus,
} from "./platformAdminFoundations.js";
export {
  createWaitlistSignup,
  readWaitlistAnalytics,
  readWaitlistSignups,
  type WaitlistAnalyticsDailyRow,
  type WaitlistAnalyticsDimension,
  type WaitlistAnalyticsReadModel,
  type WaitlistAnalyticsRow,
  type WaitlistSignupRow,
  type WaitlistSignupReadModel,
} from "./waitlist.js";
export {
  GARY_QUEUE_ACTIONS,
  mutateGaryQueue,
  readGaryDashboard,
  type GaryDashboardData,
  type GaryHeartbeat,
  type GaryQueueAction,
  type GaryReviewRow,
  type GarySourceHealth,
} from "./garyAdmin.js";
export { GoogleGmailProvider } from "./email/gmail/google.js";
export { MockGmailProvider } from "./email/gmail/mock.js";
export {
  RADAR_INGESTION_LOCK,
  DISCOVERY_INGESTION_LOCK,
  DEFAULT_RADAR_WORKER_BATCH_SIZE,
  MAX_RADAR_WORKER_BATCH_SIZE,
  radarWorkerBatchSize,
  runRadarWorker,
  runRadarWorkerTick,
  type RadarWorkerOptions,
  type RadarWorkerTickResult,
} from "./radarWorker.js";
export {
  parseResponseTime,
  extractPrestigeSignals,
  classifyEditorialDemeanor,
  extractProfileIntelligence,
  type ParsedResponseTime,
  type ExtractedPrestige,
  type EditorialDemeanor,
  type ProfileIntelligenceResult,
} from "./profileIntelligenceExtractor.js";
export {
  extractSocialLinks,
  extractLogo,
  extractGalleryCovers,
  extractPrizeWinners,
  extractProfileEnrichment,
  type ExtractedSocialLinks,
  type ExtractedVisual,
  type ExtractedPrizeWinner,
  type SinglePassExtractionResult,
} from "./profileEnrichmentWorker.js";
export {
  extractArtsOpportunity,
  ARTS_MARKERS,
  RECOGNIZED_MEDIUMS,
  type ArtsOpportunityKind,
  type ArtsExtractedOpportunity,
} from "./arts/artsOpportunityExtractor.js";
export {
  runArtsDiscovery,
  computeWindowState,
  windowStateToOpportunityStatus,
  ARTS_DISCOVERY_REGISTRY,
  type WindowState,
  type ArtsDiscoveryTarget,
  type RunArtsDiscoveryOptions,
  type RunArtsDiscoveryResult,
} from "./scripts/runArtsDiscovery.js";
export {
  reconcileExpiredOpportunitiesInDatabase,
  type ReconciliationResult,
} from "./databaseReconciliation.js";
export * from "./mediaExtractionContracts.js";
export * from "./mediaFetcher.js";
export * from "./mediaExtractor.js";
export * from "./mediaReviewService.js";
export { inferSourceRole } from "./enrichmentWorker.js";
export { runDryRun } from "./mediaDryRunCli.js";
