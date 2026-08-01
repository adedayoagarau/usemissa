import type {
  ProfileDetails,
  ProfileMaterial,
  ProfileSectionKey,
  ProfileSectionStatus,
  UserProfile,
} from '../domain/types.js';

export interface ProfileSectionSummary {
  key: ProfileSectionKey;
  label: string;
  status: ProfileSectionStatus;
  detail: string;
}

export interface ProfileReadiness {
  sections: ProfileSectionSummary[];
  nextSection?: ProfileSectionKey;
  discoverReady: boolean;
  applyReady: boolean;
  publicReady: boolean;
}

export function emptyProfile(): ProfileDetails {
  return {
    disciplines: [],
    languages: [],
    eligibility: {},
    materials: [],
    preferences: { disciplines: [], locations: [], languages: [] },
    privacy: {
      publicProfile: false,
      showLocation: false,
      shareContact: false,
      shareMaterialsByDefault: false,
    },
  };
}

export function profileFor(user: UserProfile): ProfileDetails {
  const profile = user.profile ?? emptyProfile();
  return {
    ...emptyProfile(),
    ...profile,
    disciplines: profile.disciplines ?? [],
    languages: profile.languages ?? [],
    eligibility: profile.eligibility ?? user.attributes ?? {},
    materials: profile.materials ?? [],
    preferences: { ...emptyProfile().preferences, ...(profile.preferences ?? {}) },
    privacy: { ...emptyProfile().privacy, ...(profile.privacy ?? {}) },
  };
}

function sectionStatus(done: boolean, started: boolean): ProfileSectionStatus {
  if (done) return 'complete';
  return started ? 'in-progress' : 'not-started';
}

export function profileReadiness(user: UserProfile, materials: ProfileMaterial[] = []): ProfileReadiness {
  const profile = profileFor(user);
  const availableMaterials = materials.length > 0 ? materials : profile.materials;
  const readyMaterials = availableMaterials.filter((material) => material.status === 'ready');
  const aboutDone = Boolean(user.displayName.trim());
  const practiceDone = profile.disciplines.length > 0 || user.genres.length > 0;
  const materialsDone = readyMaterials.length > 0;
  const preferencesDone = profile.preferences.disciplines.length > 0 || profile.preferences.locations.length > 0 || profile.preferences.noFeeOnly !== undefined || profile.preferences.deadlineWithinDays !== undefined;
  const privacyDone = profile.updatedAt !== undefined;
  const sections: ProfileSectionSummary[] = [
    { key: 'about', label: 'About you', status: sectionStatus(aboutDone, Boolean(profile.bio || profile.location || profile.pronouns)), detail: aboutDone ? 'Your identity is ready' : 'Add your name' },
    { key: 'practice', label: 'Your practice', status: sectionStatus(practiceDone, profile.disciplines.length > 0 || user.genres.length > 0), detail: practiceDone ? 'Missa can understand your work' : 'Choose a discipline or genre' },
    { key: 'materials', label: 'Your work', status: sectionStatus(materialsDone, availableMaterials.length > 0), detail: materialsDone ? `${readyMaterials.length} ready material${readyMaterials.length === 1 ? '' : 's'}` : 'Add a bio, work, or statement' },
    { key: 'preferences', label: 'Preferences', status: sectionStatus(preferencesDone, true), detail: preferencesDone ? 'Recommendations can be tuned' : 'Optional for now' },
    { key: 'privacy', label: 'Privacy', status: sectionStatus(privacyDone, true), detail: privacyDone ? 'Sharing choices reviewed' : 'Review before sharing' },
  ];
  return {
    sections,
    nextSection: sections.find((section) => section.status !== 'complete')?.key,
    discoverReady: aboutDone && practiceDone,
    applyReady: aboutDone && practiceDone && materialsDone,
    publicReady: aboutDone && profile.privacy.publicProfile,
  };
}

export function updateUserProfile(user: UserProfile, patch: Partial<ProfileDetails>, updatedAt: string): ProfileDetails {
  const current = profileFor(user);
  const next: ProfileDetails = {
    ...current,
    ...patch,
    preferences: { ...current.preferences, ...(patch.preferences ?? {}) },
    privacy: { ...current.privacy, ...(patch.privacy ?? {}) },
    disciplines: patch.disciplines ?? current.disciplines,
    languages: patch.languages ?? current.languages,
    eligibility: patch.eligibility ?? current.eligibility,
    updatedAt,
  };
  user.profile = next;
  if (patch.disciplines) next.preferences.disciplines = [...patch.disciplines];
  if (patch.eligibility) user.attributes = { ...patch.eligibility };
  return next;
}
