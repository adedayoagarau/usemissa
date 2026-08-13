import { createSnapshotId, sha256, type AdapterContext, type ExtractionResult, type PageSnapshot, type SourceAdapter } from "../contracts.js";
import type { Pool } from "pg";

/** Minimal bridge shape for Gary evidence; Gary remains the parser and source of truth. */
export interface GaryObservation {
  sourceUrl: string;
  observedAt?: string;
  rawHtml?: string;
  fields: Partial<Record<"title" | "organizer" | "deadline" | "entry_fee" | "cash_prize" | "description" | "official_website", string | null>>;
  fieldProvenance?: Partial<Record<string, { method?: string; sourceUrl?: string }>>;
}

export type GaryObservationLoader = (context: AdapterContext) => Promise<GaryObservation>;

/** Adapts existing Gary observations into v2 without porting Gary's Python parser. */
export class GaryObservationAdapter implements SourceAdapter {
  readonly id = "gary-observation-bridge-v2";
  private readonly observations = new Map<string, GaryObservation>();

  constructor(private readonly loadObservation: GaryObservationLoader) {}

  canHandle(source: { config: Record<string, unknown> }): boolean {
    return source.config.comparisonAdapter === "gary";
  }

  async fetch(context: AdapterContext): Promise<PageSnapshot> {
    const observation = await this.loadObservation(context);
    this.observations.set(context.run.id, observation);
    const html = observation.rawHtml ?? "";
    return {
      id: createSnapshotId(context.run.id, observation.sourceUrl), runId: context.run.id, sourceId: context.source.id,
      url: context.source.url, finalUrl: observation.sourceUrl, fetchedAt: observation.observedAt ?? new Date().toISOString(),
      statusCode: 200, contentType: html ? "text/html" : null, contentHash: sha256(html), html, rendered: false,
    };
  }

  async extract(context: AdapterContext, snapshot: PageSnapshot): Promise<ExtractionResult> {
    const observation = this.observations.get(context.run.id) ?? await this.loadObservation(context);
    const fields = Object.entries(observation.fields).flatMap(([fieldName, value]) => {
      if (value === null || value === undefined || value === "") return [];
      const provenance = observation.fieldProvenance?.[fieldName];
      return [{
        fieldName,
        rawValue: value,
        normalizedValue: value,
        confidence: 1,
        provenance: { adapterId: this.id, method: provenance?.method ?? "gary-observation", sourceUrl: provenance?.sourceUrl ?? snapshot.finalUrl, snapshotId: snapshot.id },
      }];
    });
    return { fields, candidateLinks: [], warnings: snapshot.html ? [] : ["Gary observation has no raw HTML snapshot"] };
  }
}

/** Reads one latest Gary call observation for a shadow comparison run. */
export function createGaryNeonObservationLoader(pool: Pool): GaryObservationLoader {
  return async (context) => {
    const sourceId = typeof context.source.config.garySourceId === "string" ? context.source.config.garySourceId : "pw.org";
    const targetUrl = typeof context.source.config.garyTargetUrl === "string" ? context.source.config.garyTargetUrl : null;
    const result = await pool.query<{
      source_detail_url: string; official_website: string | null; deadline: Date | null; entry_fee: string | null; cash_prize: string | null;
      description: string | null; contact_email: string | null; full_text: string; observed_at: Date; title: string; organizer: string; html_content: string | null;
    }>(
      `select o.source_detail_url, o.official_website, o.deadline, o.entry_fee, o.cash_prize,
              o.description, o.contact_email, o.full_text, o.observed_at, g.title, g.organizer,
              p.html_content
       from gary_call_observations o
       join gary_opportunities g on g.id = o.opportunity_id
       left join lateral (
         select html_content from gary_source_pages
         where observation_id = o.id and role in ('pw_detail', 'official') and error is null
         order by case when role = 'official' then 0 else 1 end, id
         limit 1
       ) p on true
       where o.source_id = $1 and ($2::text is null or o.source_detail_url = $2)
       order by o.observed_at desc
       limit 1`,
      [sourceId, targetUrl],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`No Gary observation found for source ${sourceId}${targetUrl ? ` and URL ${targetUrl}` : ""}`);
    return {
      sourceUrl: row.source_detail_url,
      observedAt: row.observed_at.toISOString(),
      rawHtml: row.html_content ?? undefined,
      fields: {
        title: row.title,
        organizer: row.organizer,
        deadline: row.deadline?.toISOString().slice(0, 10) ?? null,
        entry_fee: row.entry_fee,
        cash_prize: row.cash_prize,
        description: row.description ?? row.full_text,
        contact_email: row.contact_email,
        official_website: row.official_website,
      },
      fieldProvenance: {
        title: { method: "gary-canonical-opportunity", sourceUrl: row.source_detail_url },
        organizer: { method: "gary-canonical-opportunity", sourceUrl: row.source_detail_url },
        deadline: { method: "gary-call-observation", sourceUrl: row.source_detail_url },
      },
    };
  };
}
