import {
  creatorPoolFor,
  creatorRelationalAuthorityEnabled,
  PostgresCreatorAccountRepository,
  PostgresCreatorInboxRepository,
  PostgresCreatorEmailReviewRepository,
  PostgresCreatorLibraryRepository,
  PostgresCreatorCalendarRepository,
  PostgresCreatorNotificationRepository,
  PostgresCreatorProfileRepository,
  PostgresCreatorPreferenceRepository,
  PostgresCreatorTrackerRepository,
} from '@missa/radar-adapters';

declare global {
  var __missaCreatorAccountRepository: PostgresCreatorAccountRepository | undefined;
  var __missaCreatorProfileRepository: PostgresCreatorProfileRepository | undefined;
  var __missaCreatorPreferenceRepository: PostgresCreatorPreferenceRepository | undefined;
  var __missaCreatorTrackerRepository: PostgresCreatorTrackerRepository | undefined;
  var __missaCreatorInboxRepository: PostgresCreatorInboxRepository | undefined;
  var __missaCreatorEmailReviewRepository: PostgresCreatorEmailReviewRepository | undefined;
  var __missaCreatorLibraryRepository: PostgresCreatorLibraryRepository | undefined;
  var __missaCreatorNotificationRepository: PostgresCreatorNotificationRepository | undefined;
  var __missaCreatorCalendarRepository: PostgresCreatorCalendarRepository | undefined;
}

function pool() {
  if (!creatorRelationalAuthorityEnabled(process.env)) return undefined;
  if (!process.env.DATABASE_URL) throw new Error('Creator relational authority is unavailable');
  return creatorPoolFor(process.env.DATABASE_URL);
}

export function getCreatorAccountRepository(): PostgresCreatorAccountRepository | undefined {
  const database = pool();
  if (!database) return undefined;
  if (!globalThis.__missaCreatorAccountRepository) globalThis.__missaCreatorAccountRepository = new PostgresCreatorAccountRepository(database);
  return globalThis.__missaCreatorAccountRepository;
}

export function getCreatorProfileRepository(): PostgresCreatorProfileRepository | undefined {
  const database = pool();
  if (!database) return undefined;
  if (!globalThis.__missaCreatorProfileRepository) globalThis.__missaCreatorProfileRepository = new PostgresCreatorProfileRepository(database);
  return globalThis.__missaCreatorProfileRepository;
}

export function getCreatorPreferenceRepository(): PostgresCreatorPreferenceRepository | undefined {
  const database = pool();
  if (!database) return undefined;
  if (!globalThis.__missaCreatorPreferenceRepository) globalThis.__missaCreatorPreferenceRepository = new PostgresCreatorPreferenceRepository(database);
  return globalThis.__missaCreatorPreferenceRepository;
}

export function getCreatorTrackerRepository(): PostgresCreatorTrackerRepository | undefined {
  const database = pool();
  if (!database) return undefined;
  if (!globalThis.__missaCreatorTrackerRepository) globalThis.__missaCreatorTrackerRepository = new PostgresCreatorTrackerRepository(database);
  return globalThis.__missaCreatorTrackerRepository;
}

export function getCreatorInboxRepository(): PostgresCreatorInboxRepository | undefined {
  const database = pool();
  if (!database) return undefined;
  if (!globalThis.__missaCreatorInboxRepository) globalThis.__missaCreatorInboxRepository = new PostgresCreatorInboxRepository(database);
  return globalThis.__missaCreatorInboxRepository;
}

export function getCreatorEmailReviewRepository(): PostgresCreatorEmailReviewRepository | undefined {
  const database = pool();
  if (!database) return undefined;
  if (!globalThis.__missaCreatorEmailReviewRepository) globalThis.__missaCreatorEmailReviewRepository = new PostgresCreatorEmailReviewRepository(database);
  return globalThis.__missaCreatorEmailReviewRepository;
}

export function getCreatorLibraryRepository(): PostgresCreatorLibraryRepository | undefined {
  const database = pool();
  if (!database) return undefined;
  if (!globalThis.__missaCreatorLibraryRepository) globalThis.__missaCreatorLibraryRepository = new PostgresCreatorLibraryRepository(database);
  return globalThis.__missaCreatorLibraryRepository;
}

export function getCreatorNotificationRepository(): PostgresCreatorNotificationRepository | undefined {
  const database = pool();
  if (!database) return undefined;
  if (!globalThis.__missaCreatorNotificationRepository) globalThis.__missaCreatorNotificationRepository = new PostgresCreatorNotificationRepository(database);
  return globalThis.__missaCreatorNotificationRepository;
}

export function getCreatorCalendarRepository(): PostgresCreatorCalendarRepository | undefined {
  const database = pool();
  if (!database) return undefined;
  if (!globalThis.__missaCreatorCalendarRepository) globalThis.__missaCreatorCalendarRepository = new PostgresCreatorCalendarRepository(database);
  return globalThis.__missaCreatorCalendarRepository;
}
