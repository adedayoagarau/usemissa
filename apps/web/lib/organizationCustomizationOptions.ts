import type { OrganizationAccent, OrganizationSubmissionStage } from '@missa/radar-engine';
import type { StatusTransparency } from '@missa/workspace-engine';

/**
 * Client-safe option lists for organization appearance settings. This module
 * must stay free of runtime imports from server packages: the settings form
 * is a client component, and @missa/workspace-engine pulls in the Postgres
 * driver. Type-only imports are erased and are fine.
 */

export const ORGANIZATION_ACCENTS: ReadonlyArray<{ id: OrganizationAccent; label: string; description: string }> = [
  { id: 'forest', label: 'Forest', description: 'Missa default. Deep green primary.' },
  { id: 'ochre', label: 'Ochre', description: 'Warm amber for awards and prizes.' },
  { id: 'mineral', label: 'Mineral', description: 'Cool blue for residencies and programmes.' },
  { id: 'moss', label: 'Moss', description: 'Soft olive for journals and presses.' },
  { id: 'ink', label: 'Ink', description: 'Near-black for a quiet, typographic feel.' },
];

export const STATUS_TRANSPARENCY_OPTIONS: ReadonlyArray<{ id: StatusTransparency; label: string; description: string }> = [
  { id: 'minimal', label: 'Minimal', description: 'Submitters see receipt and final decision only.' },
  { id: 'stages', label: 'Stages', description: 'Submitters also see each stage you announce (longlist, shortlist, finalist).' },
  { id: 'full', label: 'Full', description: 'Submitters also see when reading has started. Never who is reading or any score.' },
];

export const SUBMISSION_STAGES: readonly OrganizationSubmissionStage[] = ['longlist', 'shortlist', 'finalist'];
