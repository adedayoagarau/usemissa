import { z } from "zod";

export const resourceIdSchema = z
  .string()
  .min(3)
  .max(128)
  .regex(
    /^[a-z][a-z0-9-]*_[A-Za-z0-9-]+$/,
    "Expected a prefixed Missa resource ID",
  );

export const organizationRoleSchema = z.enum(["member", "admin"]);

export const organizationMemberMutationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: organizationRoleSchema.default("member"),
});

export const auditEventSchema = z.object({
  accountId: resourceIdSchema.optional(),
  organizationId: resourceIdSchema.optional(),
  action: z.string().min(1).max(128),
  targetType: z.string().min(1).max(64),
  targetId: resourceIdSchema,
  detail: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.iso.datetime(),
});

export const outboxEventSchema = z.object({
  id: z.uuid(),
  topic: z.string().min(1).max(128),
  aggregateType: z.string().min(1).max(64),
  aggregateId: resourceIdSchema,
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.iso.datetime(),
});

export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export type OrganizationMemberMutation = z.infer<
  typeof organizationMemberMutationSchema
>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type OutboxEvent = z.infer<typeof outboxEventSchema>;
