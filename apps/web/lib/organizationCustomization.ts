import { z } from 'zod';
import type { Organization, OrganizationAccent, OrganizationCustomization, OrganizationSubmissionStage } from '@missa/radar-engine';
import { DEFAULT_STAGE_LABELS, type StatusTransparency } from '@missa/workspace-engine';

/**
 * Per-organization presentation and communication defaults. The record lives
 * on the radar Organization (jsonb), so nothing here changes a table. Values
 * are validated on write and resolved with defaults on read so pages never
 * branch on a missing field.
 */

export { ORGANIZATION_ACCENTS, STATUS_TRANSPARENCY_OPTIONS, SUBMISSION_STAGES } from './organizationCustomizationOptions';
import { SUBMISSION_STAGES } from './organizationCustomizationOptions';

const stageLabel = z.string().trim().min(1).max(40);

export const organizationCustomizationSchema = z
  .object({
    displayName: z.string().trim().max(80).optional(),
    logoUrl: z
      .string()
      .trim()
      .url()
      .refine((value) => value.startsWith('https://'), 'Logo must be served over https')
      .optional(),
    accent: z.enum(['forest', 'ochre', 'mineral', 'moss', 'ink']).optional(),
    density: z.enum(['compact', 'comfortable']).optional(),
    stageLabels: z.object({ longlist: stageLabel.optional(), shortlist: stageLabel.optional(), finalist: stageLabel.optional() }).strict().optional(),
    declaredStages: z.array(z.enum(['longlist', 'shortlist', 'finalist'])).max(3).optional(),
    statusTransparency: z.enum(['minimal', 'stages', 'full']).optional(),
    communications: z
      .object({
        senderName: z.string().trim().max(80).optional(),
        replyTo: z.string().trim().email().optional(),
        signoff: z.string().trim().max(200).optional(),
        secondApproverRequired: z.boolean().optional(),
        adminDigest: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type OrganizationCustomizationInput = z.infer<typeof organizationCustomizationSchema>;

export interface ResolvedOrganizationCustomization {
  displayName: string;
  logoUrl?: string;
  accent: OrganizationAccent;
  density: 'compact' | 'comfortable';
  stageLabels: Record<OrganizationSubmissionStage, string>;
  declaredStages: OrganizationSubmissionStage[];
  statusTransparency: StatusTransparency;
  communications: { senderName: string; replyTo?: string; signoff: string; secondApproverRequired: boolean; adminDigest: boolean };
}

/** Removes empty strings so a cleared field falls back to the default instead of saving "". */
export function normalizeCustomizationInput(input: OrganizationCustomizationInput): OrganizationCustomization {
  const clean = <T extends Record<string, unknown>>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '' && item !== undefined)) as T;
  const next: OrganizationCustomization = clean({
    displayName: input.displayName,
    logoUrl: input.logoUrl,
    accent: input.accent,
    density: input.density,
    statusTransparency: input.statusTransparency,
    declaredStages: input.declaredStages ? [...new Set(input.declaredStages)].sort((left, right) => SUBMISSION_STAGES.indexOf(left) - SUBMISSION_STAGES.indexOf(right)) : undefined,
  });
  if (input.stageLabels) {
    const labels = clean(input.stageLabels);
    if (Object.keys(labels).length) next.stageLabels = labels;
  }
  if (input.communications) {
    const communications = clean(input.communications);
    if (Object.keys(communications).length) next.communications = communications;
  }
  return next;
}

export function resolveOrganizationCustomization(organization: Pick<Organization, 'name' | 'customization'>): ResolvedOrganizationCustomization {
  const stored = organization.customization ?? {};
  return {
    displayName: stored.displayName?.trim() || organization.name,
    logoUrl: stored.logoUrl,
    accent: stored.accent ?? 'forest',
    density: stored.density ?? 'compact',
    stageLabels: { ...DEFAULT_STAGE_LABELS, ...(stored.stageLabels ?? {}) },
    declaredStages: stored.declaredStages ?? [],
    statusTransparency: stored.statusTransparency ?? 'stages',
    communications: {
      senderName: stored.communications?.senderName?.trim() || stored.displayName?.trim() || organization.name,
      replyTo: stored.communications?.replyTo,
      signoff: stored.communications?.signoff?.trim() || `The team at ${stored.displayName?.trim() || organization.name}`,
      secondApproverRequired: stored.communications?.secondApproverRequired ?? false,
      adminDigest: stored.communications?.adminDigest ?? true,
    },
  };
}

/** Merges a partial update into the stored record; sections not in the patch are kept. */
export function mergeCustomization(current: OrganizationCustomization | undefined, patch: OrganizationCustomization): OrganizationCustomization {
  const next: OrganizationCustomization = { ...(current ?? {}), ...patch };
  if (patch.stageLabels === undefined && current?.stageLabels) next.stageLabels = current.stageLabels;
  if (patch.communications === undefined && current?.communications) next.communications = current.communications;
  return next;
}
