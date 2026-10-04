import type {
  AdapterContext,
  ExtractedField,
  ExtractionResult,
  PageSnapshot,
  SourceAdapter,
} from "../contracts.js";
import { GenericHtmlAdapter } from "./html.js";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function objects(value: unknown): JsonObject[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is JsonObject => Boolean(object(entry)))
    : [];
}

function nextData(html: string): JsonObject | undefined {
  const payload = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  )?.[1];
  if (!payload) return undefined;
  try {
    return object(JSON.parse(payload));
  } catch {
    return undefined;
  }
}

function at(value: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((current, key) => object(current)?.[key], value);
}

function currentCloseDate(
  call: JsonObject,
  now = Date.now(),
): string | undefined {
  const windows = objects(at(call, "readingPeriod", "subWindows"));
  return windows
    .map((window) => text(window.closeDate))
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, timestamp: Date.parse(value) }))
    .filter(({ timestamp }) => Number.isFinite(timestamp) && timestamp >= now)
    .sort((left, right) => left.timestamp - right.timestamp)[0]?.value;
}

function profilePath(entityType: string | undefined, key: string): string {
  return entityType === "press"
    ? `/press/${key}`
    : entityType === "magazine"
      ? `/magazine/${key}`
      : `/organization/${key}`;
}

function field(
  adapterId: string,
  snapshot: PageSnapshot,
  recordId: string,
  sourceUrl: string,
  fieldName: string,
  value: string | undefined,
  method: string,
): ExtractedField | undefined {
  if (!value) return undefined;
  return {
    fieldName,
    rawValue: value,
    normalizedValue: value,
    confidence: 0.95,
    provenance: {
      adapterId,
      method,
      sourceUrl,
      snapshotId: snapshot.id,
      recordId,
    },
  };
}

/** Public Chill Subs pages expose a bounded Next.js data payload. The index
 * identifies calls; the organization profile binds that call id to its real
 * submission URL. This adapter never calls an undocumented private API. */
export class ChillSubsNextAdapter implements SourceAdapter {
  readonly id = "chill-subs-next-v2";
  private readonly html = new GenericHtmlAdapter();

  canHandle(source: {
    adapterId: string;
    config: Record<string, unknown>;
  }): boolean {
    return (
      source.adapterId === this.id ||
      source.config.transport === "chill-subs-next"
    );
  }

  fetch(context: AdapterContext): Promise<PageSnapshot> {
    return this.html.fetch(context);
  }

  async extract(
    context: AdapterContext,
    snapshot: PageSnapshot,
  ): Promise<ExtractionResult> {
    if (
      !new URL(snapshot.finalUrl || snapshot.url).hostname.endsWith(
        "chillsubs.com",
      )
    ) {
      return this.html.extract(context, snapshot);
    }

    const parsed = nextData(snapshot.html);
    if (!parsed) {
      return {
        fields: [],
        candidateLinks: [],
        warnings: ["Chill Subs page did not contain valid public Next.js data"],
      };
    }

    const pageProps = at(parsed, "props", "pageProps");
    const callId = new URL(context.source.url).searchParams.get("call");
    return callId
      ? this.extractProfile(snapshot, pageProps, callId)
      : this.extractIndex(snapshot, pageProps);
  }

  private extractIndex(
    snapshot: PageSnapshot,
    pageProps: unknown,
  ): ExtractionResult {
    const calls = objects(at(pageProps, "browseData"));
    const unique = new Map<
      string,
      {
        call: JsonObject;
        id: string;
        title: string;
        organization: string;
        closeDate: string;
        key: string;
      }
    >();

    for (const call of calls) {
      const id = text(call.id);
      const title = text(call.title);
      const organization = text(call.name);
      const key = text(call.key);
      const closeDate = currentCloseDate(call);
      if (
        !id ||
        !title ||
        !organization ||
        !key ||
        !closeDate ||
        text(call.status)?.toLowerCase() !== "open" ||
        ["closed", "deleted", "inactive"].includes(
          text(call.entityStatus)?.toLowerCase() ?? "",
        )
      ) {
        continue;
      }
      const identity = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "")}|${organization
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")}|${closeDate}`;
      if (!unique.has(identity)) {
        unique.set(identity, { call, id, title, organization, closeDate, key });
      }
    }

    const selected = [...unique.values()].sort(
      (left, right) =>
        Date.parse(left.closeDate) - Date.parse(right.closeDate) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id),
    );
    const fields: ExtractedField[] = [];
    const candidateLinks: ExtractionResult["candidateLinks"] = [];
    for (const item of selected) {
      const entityType = text(item.call.entityType);
      const profileUrl = new URL(
        `${profilePath(entityType, item.key)}?call=${encodeURIComponent(item.id)}`,
        snapshot.finalUrl,
      ).href;
      candidateLinks.push({
        url: profileUrl,
        stableId: item.id,
        title: item.title,
        role: "detail",
        authority: "destination",
      });
      fields.push(
        ...[
          field(
            this.id,
            snapshot,
            item.id,
            profileUrl,
            "title",
            item.title,
            "chill-subs-index-title",
          ),
          field(
            this.id,
            snapshot,
            item.id,
            profileUrl,
            "organization",
            item.organization,
            "chill-subs-index-organization",
          ),
          field(
            this.id,
            snapshot,
            item.id,
            profileUrl,
            "description",
            text(item.call.description),
            "chill-subs-index-description",
          ),
          field(
            this.id,
            snapshot,
            item.id,
            profileUrl,
            "deadline",
            item.closeDate,
            "chill-subs-index-deadline",
          ),
          field(
            this.id,
            snapshot,
            item.id,
            profileUrl,
            "opportunityType",
            "contest",
            "chill-subs-index-type",
          ),
        ].filter((entry): entry is ExtractedField => Boolean(entry)),
      );
    }

    return {
      fields,
      candidateLinks,
      warnings: candidateLinks.length
        ? []
        : ["Chill Subs index contained no current open contest records"],
    };
  }

  private extractProfile(
    snapshot: PageSnapshot,
    pageProps: unknown,
    callId: string,
  ): ExtractionResult {
    const listing = object(at(pageProps, "listing"));
    const call = objects(listing?.subCalls).find(
      (entry) => text(entry.id) === callId,
    );
    const title = text(call?.title);
    const organization = text(listing?.name);
    const closeDate = call ? currentCloseDate(call) : undefined;
    const applyUrl = text(call?.link);
    if (
      !call ||
      !title ||
      !organization ||
      !closeDate ||
      text(call.status)?.toLowerCase() !== "open" ||
      !applyUrl ||
      !applyUrl.startsWith("https://")
    ) {
      return {
        fields: [],
        candidateLinks: [],
        warnings: [
          `Chill Subs profile did not reconcile current call ${callId}`,
        ],
      };
    }

    const fields = [
      field(
        this.id,
        snapshot,
        callId,
        applyUrl,
        "title",
        title,
        "chill-subs-profile-title",
      ),
      field(
        this.id,
        snapshot,
        callId,
        applyUrl,
        "organization",
        organization,
        "chill-subs-profile-organization",
      ),
      field(
        this.id,
        snapshot,
        callId,
        applyUrl,
        "description",
        text(call.description),
        "chill-subs-profile-description",
      ),
      field(
        this.id,
        snapshot,
        callId,
        applyUrl,
        "deadline",
        closeDate,
        "chill-subs-profile-deadline",
      ),
      field(
        this.id,
        snapshot,
        callId,
        applyUrl,
        "opportunityType",
        "contest",
        "chill-subs-profile-type",
      ),
    ].filter((entry): entry is ExtractedField => Boolean(entry));

    return {
      fields,
      candidateLinks: [
        {
          url: applyUrl,
          stableId: callId,
          title: `Apply to ${title}`,
          role: "apply",
          authority: "destination",
        },
      ],
      warnings: [],
    };
  }
}
