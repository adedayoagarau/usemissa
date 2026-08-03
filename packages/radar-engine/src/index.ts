export * from './domain/types.js';
export * from './ports.js';
export * from './opportunityPorts.js';
export { DEFAULT_PROFILE_PRIVACY, RadarEngine, ProfilePrivacyValidationError, ProfileValidationError, type TickReport, type RadarStats, type RadarEngineOptions } from './engine.js';
export { createStore, loadStore, saveStore, changesFor, versionsFor, membershipKey, type RadarStore } from './store/store.js';
export { LibraryValidationError, libraryForUser, createLibraryWork, updateLibraryWork, deleteLibraryWork, createLibraryFile, deleteLibraryFile, createSavedAnswer, updateSavedAnswer, deleteSavedAnswer } from './library/library.js';
export { CustomListValidationError, customListsForUser, customListMembershipsForUser, customListsForOpportunity, opportunitiesForCustomList, createCustomList, updateCustomList, deleteCustomList, addOpportunityToCustomList, removeOpportunityFromCustomList } from './lists/lists.js';
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
export { FixtureFetcher, HttpFetcher, stripHtml } from './ingestion/fetcher.js';
export { isDue, dueSources } from './ingestion/scheduler.js';
export { contentHash } from './ingestion/snapshot.js';
export { DeterministicExtractor } from './extraction/extractor.js';
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
export { matchesCriteria, matchProfiles, type MatchResult } from './matching/matching.js';
export { fitScore, formatFee } from './matching/fit.js';
export { buildInboxDigest, matchOrganizationByDomain, type InboxDigest } from './alerts/alerts.js';
export { verificationQueue } from './verification/verification.js';
export {
  isMyStatus,
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
export { AuthError, membershipsFor, isOrgMember } from './auth/accounts.js';
export {
  hashPassword, verifyPassword, createSessionToken, verifySessionToken, type SessionPayload,
  createFeedToken, verifyFeedToken, type FeedTokenPayload,
} from './auth/crypto.js';
export { buildIcsFeed } from './tracker/calendarFeed.js';
export {
  TRACKER_IMPORT_MAX_BYTES,
  TRACKER_IMPORT_MAX_ROWS,
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
  type ParsedTrackerCsv,
  type TrackerImportPlan,
  type TrackerImportPlanRow,
  type TrackerImportResult,
} from './import/trackerImport.js';
export { buildServerDemoWorld, type ServerDemoWorld, type DemoCredential } from './fixtures/serverDemo.js';
export { buildDemoWorld, ManualClock } from './fixtures/seed.js';
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
} from './registry/index.js';
export type {
  SourceTier,
  VerticalGroup,
  RegistryVertical,
  SourceRegistryEntry,
  SourceRegistry,
  RegistryStats,
  LoadRegistryOptions,
} from './registry/types.js';
