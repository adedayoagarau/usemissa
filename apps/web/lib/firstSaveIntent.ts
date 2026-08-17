import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { OpportunityDetailProjection } from "@missa/radar-engine";

import { sessionSecret } from "./auth";
import type {
  FirstSaveContext,
  FirstSaveMaterialChange,
  FirstSaveNextAction,
} from "./firstSaveTypes";

export const FIRST_SAVE_INTENT_COOKIE = "missa_first_save";
export const FIRST_SAVE_INTENT_MAX_AGE_SECONDS = 30 * 60;
export const FIRST_SAVE_RECEIPT_MAX_AGE_SECONDS = 24 * 60 * 60;

export type FirstSaveMaterialSnapshot = {
  status: OpportunityDetailProjection["status"];
  deadline: {
    kind: OpportunityDetailProjection["deadline"]["kind"];
    date?: string;
    time?: string;
    timezone?: string;
  };
  fee: {
    status: OpportunityDetailProjection["fee"]["status"];
    amountCents?: number;
    currency?: string;
  };
  source: { name: string; location: string };
  eligibilityDigest: string;
  destinationLocation?: string;
  submissionAvailable: boolean;
};

export type FirstSaveIntent = {
  version: 1;
  kind: "save-to-tracker";
  journeyId: string;
  boundAccountId?: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
  returnTo: string;
  context: Omit<FirstSaveContext, "expiresAt" | "journeyId">;
  material: FirstSaveMaterialSnapshot;
  materialFingerprint: string;
};

export type FirstSaveCompletionClaim = {
  version: 1;
  kind: "first-save-completion";
  journeyId: string;
  accountId: string;
  opportunityId: string;
  expiresAt: string;
};

type IntentOptions = {
  now?: Date;
  journeyId?: string;
  nonce?: string;
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("base64url");
}

function safeLocation(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    const pathname =
      url.pathname.replace(/\/{2,}/gu, "/").replace(/\/$/u, "") || "/";
    return `${url.host.toLocaleLowerCase("en")}${pathname}`;
  } catch {
    return undefined;
  }
}

function eligibilityDigest(opportunity: OpportunityDetailProjection): string {
  return digest(
    opportunity.eligibility
      .map((rule) => ({
        key: rule.key.trim(),
        description: rule.description.trim(),
        value: rule.value?.trim() ?? "",
        certainty: rule.certainty,
      }))
      .sort((left, right) =>
        `${left.key}:${left.description}`.localeCompare(
          `${right.key}:${right.description}`,
        ),
      ),
  );
}

export function firstSaveMaterialSnapshot(
  opportunity: OpportunityDetailProjection,
): FirstSaveMaterialSnapshot {
  return {
    status: opportunity.status,
    deadline: {
      kind: opportunity.deadline.kind,
      ...(opportunity.deadline.date ? { date: opportunity.deadline.date } : {}),
      ...(opportunity.deadline.time ? { time: opportunity.deadline.time } : {}),
      ...(opportunity.deadline.timezone
        ? { timezone: opportunity.deadline.timezone }
        : {}),
    },
    fee: {
      status: opportunity.fee.status,
      ...(opportunity.fee.amountCents !== undefined
        ? { amountCents: opportunity.fee.amountCents }
        : {}),
      ...(opportunity.fee.currency
        ? { currency: opportunity.fee.currency }
        : {}),
    },
    source: {
      name: opportunity.source.name.slice(0, 160),
      location: safeLocation(opportunity.source.url) ?? "unavailable",
    },
    eligibilityDigest: eligibilityDigest(opportunity),
    ...(safeLocation(opportunity.submissionUrl)
      ? { destinationLocation: safeLocation(opportunity.submissionUrl) }
      : {}),
    submissionAvailable: opportunity.submissionAvailable,
  };
}

export function firstSaveMaterialFingerprint(
  snapshot: FirstSaveMaterialSnapshot,
): string {
  return digest(snapshot);
}

export function createFirstSaveIntent(
  opportunity: OpportunityDetailProjection,
  returnTo: string,
  options: IntentOptions = {},
): FirstSaveIntent {
  const now = options.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + FIRST_SAVE_INTENT_MAX_AGE_SECONDS * 1_000,
  );
  const material = firstSaveMaterialSnapshot(opportunity);
  return {
    version: 1,
    kind: "save-to-tracker",
    journeyId: options.journeyId ?? randomUUID(),
    nonce: options.nonce ?? randomBytes(16).toString("base64url"),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    returnTo,
    context: {
      opportunityId: opportunity.id,
      slug: opportunity.slug,
      title: opportunity.title.slice(0, 240),
      ...(opportunity.organizationName
        ? { organizationName: opportunity.organizationName.slice(0, 160) }
        : {}),
    },
    material,
    materialFingerprint: firstSaveMaterialFingerprint(material),
  };
}

export function signFirstSaveIntent(
  intent: FirstSaveIntent,
  secret = sessionSecret(),
): string {
  const body = Buffer.from(JSON.stringify(intent)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyFirstSaveIntent(
  token: string | undefined,
  options: { now?: Date; secret?: string } = {},
): FirstSaveIntent | undefined {
  if (!token || token.length > 8_192) return undefined;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return undefined;
  const expected = createHmac("sha256", options.secret ?? sessionSecret())
    .update(body)
    .digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return undefined;
  }
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return undefined;
  }
  try {
    const value = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as FirstSaveIntent;
    if (
      value.version !== 1 ||
      value.kind !== "save-to-tracker" ||
      !/^[0-9a-f-]{36}$/iu.test(value.journeyId) ||
      (value.boundAccountId !== undefined &&
        (typeof value.boundAccountId !== "string" ||
          value.boundAccountId.length < 1 ||
          value.boundAccountId.length > 200)) ||
      !/^[A-Za-z0-9_-]{16,64}$/u.test(value.nonce) ||
      !value.context?.opportunityId ||
      !value.context?.slug ||
      !value.material ||
      !value.materialFingerprint ||
      !value.returnTo.startsWith("/opportunities/")
    ) {
      return undefined;
    }
    const now = options.now ?? new Date();
    if (new Date(value.expiresAt).getTime() <= now.getTime()) return undefined;
    if (
      firstSaveMaterialFingerprint(value.material) !== value.materialFingerprint
    ) {
      return undefined;
    }
    return value;
  } catch {
    return undefined;
  }
}

export function firstSaveContext(intent: FirstSaveIntent): FirstSaveContext {
  return {
    journeyId: intent.journeyId,
    ...intent.context,
    expiresAt: intent.expiresAt,
  };
}

export function bindFirstSaveIntent(
  intent: FirstSaveIntent,
  accountId: string,
): FirstSaveIntent {
  return { ...intent, boundAccountId: accountId };
}

function dateLabel(value: FirstSaveMaterialSnapshot["deadline"]): string {
  if (value.date) {
    const time = value.time ? ` at ${value.time}` : "";
    const timezone = value.timezone ? ` ${value.timezone}` : "";
    return `${value.date}${time}${timezone}`;
  }
  if (value.kind === "rolling") return "Rolling deadline";
  if (value.kind === "until-filled") return "Until filled";
  if (value.kind === "conflicting") return "Deadline needs confirmation";
  return "Deadline not listed";
}

function feeLabel(value: FirstSaveMaterialSnapshot["fee"]): string {
  if (value.status === "no-fee") return "No application fee";
  if (value.status === "unknown") return "Fee not listed";
  if (value.amountCents !== undefined && value.currency) {
    return `${value.amountCents / 100} ${value.currency}`;
  }
  return "Application fee listed";
}

function availabilityLabel(value: boolean): string {
  return value ? "Application available" : "Application unavailable";
}

export function compareFirstSaveMaterial(
  before: FirstSaveMaterialSnapshot,
  after: FirstSaveMaterialSnapshot,
): FirstSaveMaterialChange[] {
  const changes: FirstSaveMaterialChange[] = [];
  if (before.status !== after.status) {
    changes.push({
      code: "status",
      label: "Status",
      before: before.status,
      after: after.status,
    });
  }
  if (stable(before.deadline) !== stable(after.deadline)) {
    changes.push({
      code: "deadline",
      label: "Deadline",
      before: dateLabel(before.deadline),
      after: dateLabel(after.deadline),
    });
  }
  if (stable(before.fee) !== stable(after.fee)) {
    changes.push({
      code: "fee",
      label: "Application fee",
      before: feeLabel(before.fee),
      after: feeLabel(after.fee),
    });
  }
  if (stable(before.source) !== stable(after.source)) {
    changes.push({
      code: "source",
      label: "Official source",
      before: `${before.source.name} (${before.source.location})`,
      after: `${after.source.name} (${after.source.location})`,
    });
  }
  if (before.eligibilityDigest !== after.eligibilityDigest) {
    changes.push({
      code: "eligibility",
      label: "Eligibility",
      before: "Earlier eligibility details",
      after: "Updated eligibility details",
    });
  }
  if (before.destinationLocation !== after.destinationLocation) {
    changes.push({
      code: "destination",
      label: "Application destination",
      before: before.destinationLocation ?? "Not listed",
      after: after.destinationLocation ?? "Not listed",
    });
  }
  if (before.submissionAvailable !== after.submissionAvailable) {
    changes.push({
      code: "application-availability",
      label: "Application availability",
      before: availabilityLabel(before.submissionAvailable),
      after: availabilityLabel(after.submissionAvailable),
    });
  }
  return changes;
}

export function firstSaveNextAction(
  opportunity: OpportunityDetailProjection,
): FirstSaveNextAction {
  const href = `/opportunities/${opportunity.slug}`;
  if (opportunity.deadline.kind === "conflicting") {
    return {
      kind: "check-deadline",
      label: "Check the deadline",
      description:
        "The available sources do not agree. Confirm the deadline before preparing work.",
      href,
    };
  }
  const firstRequiredMaterial = opportunity.requiredMaterials.find(
    (material) => material.required,
  );
  if (firstRequiredMaterial) {
    return {
      kind: "review-requirements",
      label: "Review requirements",
      description: `Start with ${firstRequiredMaterial.label}.`,
      href,
    };
  }
  if (opportunity.fee.status === "unknown") {
    return {
      kind: "check-fee",
      label: "Check the fee",
      description:
        "The current record does not list an application fee. Confirm it at the official source.",
      href,
    };
  }
  return {
    kind: "review-opportunity",
    label: "Review Opportunity",
    description:
      "Check the current requirements and official source before preparing work.",
    href,
  };
}

export function createFirstSaveCompletionToken(
  input: { journeyId: string; accountId: string; opportunityId: string },
  options: { now?: Date; secret?: string } = {},
): { token: string; expiresAt: string } {
  const now = options.now ?? new Date();
  const claim: FirstSaveCompletionClaim = {
    version: 1,
    kind: "first-save-completion",
    journeyId: input.journeyId,
    accountId: input.accountId,
    opportunityId: input.opportunityId,
    expiresAt: new Date(
      now.getTime() + FIRST_SAVE_RECEIPT_MAX_AGE_SECONDS * 1_000,
    ).toISOString(),
  };
  const body = Buffer.from(JSON.stringify(claim)).toString("base64url");
  const signature = createHmac("sha256", options.secret ?? sessionSecret())
    .update(body)
    .digest("base64url");
  return { token: `${body}.${signature}`, expiresAt: claim.expiresAt };
}

export function verifyFirstSaveCompletionToken(
  token: string | undefined,
  options: { now?: Date; secret?: string } = {},
): FirstSaveCompletionClaim | undefined {
  if (!token || token.length > 2_048) return undefined;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return undefined;
  const expected = createHmac("sha256", options.secret ?? sessionSecret())
    .update(body)
    .digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return undefined;
  }
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return undefined;
  }
  try {
    const claim = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as FirstSaveCompletionClaim;
    if (
      claim.version !== 1 ||
      claim.kind !== "first-save-completion" ||
      !/^[0-9a-f-]{36}$/iu.test(claim.journeyId) ||
      !claim.accountId ||
      !claim.opportunityId ||
      new Date(claim.expiresAt).getTime() <=
        (options.now ?? new Date()).getTime()
    ) {
      return undefined;
    }
    return claim;
  } catch {
    return undefined;
  }
}

export function firstSaveCookieOptions(
  maxAge = FIRST_SAVE_INTENT_MAX_AGE_SECONDS,
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
