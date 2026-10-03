import { CreatorRepositoryBase, creatorPoolFor } from "@missa/radar-adapters";
import type { PreSubmitInput, PreSubmitMaterial } from "./pre-submit-check.ts";

type Confidence = "confirmed" | "probable" | "unknown";

/** Gathers what Missa actually holds for a pre-submit check. Read-only. */
export class PreSubmitRepository extends CreatorRepositoryBase {
  constructor() {
    if (!process.env.DATABASE_URL)
      throw new Error("Application storage unavailable");
    super(creatorPoolFor(process.env.DATABASE_URL));
  }

  async input(
    accountId: string,
    opportunityId: string,
  ): Promise<PreSubmitInput | null> {
    const tracked = (
      await this.query<{ id: string; work_id: string | null }>(
        "select id,work_id from tracked_opportunities where account_id=$1 and opportunity_id=$2",
        [accountId, opportunityId],
      )
    ).rows[0];
    if (!tracked) return null;

    const [items, call, required, person] = await Promise.all([
      this.query<{
        label: string;
        state: string;
        work_id: string | null;
        file_id: string | null;
        saved_answer_id: string | null;
      }>(
        `select i.label,i.state,i.work_id,i.file_id,i.saved_answer_id from tracker_checklist_items i join tracker_checklists c on c.id=i.checklist_id and c.account_id=i.account_id
         where c.account_id=$1 and c.tracked_opportunity_id=$2 and i.state<>'not-applicable' order by i.position`,
        [accountId, tracked.id],
      ),
      this.query<{
        word_limit_max: number | null;
        page_limit_max: number | null;
        confidence: Confidence;
        eligibility_summary: string | null;
      }>(
        "select word_limit_max,page_limit_max,confidence,eligibility_summary from opportunity_call_profiles where opportunity_id=$1",
        [opportunityId],
      ).catch(() => ({ rows: [] })),
      this.query<{ label: string }>(
        "select label from opportunity_required_materials where opportunity_id=$1",
        [opportunityId],
      ).catch(() => ({ rows: [] })),
      this.query<{
        display_name: string | null;
        given_name: string | null;
        family_name: string | null;
      }>(
        "select display_name,given_name,family_name from creator_profiles where account_id=$1",
        [accountId],
      ),
    ]);

    const workIds = [
      ...new Set(
        [tracked.work_id, ...items.rows.map((item) => item.work_id)].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ];
    const answerIds = [
      ...new Set(
        items.rows
          .map((item) => item.saved_answer_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const [works, answers] = await Promise.all([
      this.query<{
        id: string;
        title: string;
        description: string | null;
        file_id: string | null;
      }>(
        "select id,title,description,metadata->>'fileId' as file_id from creator_library_works where account_id=$1 and id=any($2::text[])",
        [accountId, workIds],
      ),
      this.query<{ id: string; label: string; answer: string }>(
        "select id,label,answer from creator_saved_answers where account_id=$1 and id=any($2::text[])",
        [accountId, answerIds],
      ),
    ]);
    const fileIds = [
      ...new Set(
        [
          ...items.rows.map((item) => item.file_id),
          ...works.rows.map((work) => work.file_id),
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    const files = await this.query<{
      id: string;
      name: string;
      mime_type: string | null;
    }>(
      "select id,name,mime_type from creator_library_files where account_id=$1 and id=any($2::text[])",
      [accountId, fileIds],
    );

    const requirementFor = (
      match: (item: (typeof items.rows)[number]) => boolean,
    ) => items.rows.find(match)?.label;
    const materials: PreSubmitMaterial[] = [
      ...works.rows.map<PreSubmitMaterial>((work) => ({
        kind: "work",
        id: work.id,
        title: work.title,
        requirement: requirementFor((item) => item.work_id === work.id),
      })),
      ...answers.rows.map<PreSubmitMaterial>((answer) => ({
        kind: "answer",
        id: answer.id,
        title: answer.label,
        text: answer.answer,
        requirement: requirementFor(
          (item) => item.saved_answer_id === answer.id,
        ),
      })),
      ...files.rows.map<PreSubmitMaterial>((file) => ({
        kind: "file",
        id: file.id,
        title: file.name,
        fileName: file.name,
        ...(file.mime_type ? { mimeType: file.mime_type } : {}),
        requirement: requirementFor((item) => item.file_id === file.id),
      })),
    ];

    const callProfile = call.rows[0];
    const blindReview = Boolean(
      /\b(blind|anonymous|anonymi[sz]ed)\b/iu.test(
        callProfile?.eligibility_summary ?? "",
      ) ||
      required.rows.some((material) => /blind|anonym/iu.test(material.label)),
    );
    const names = person.rows[0]
      ? [
          person.rows[0].display_name,
          person.rows[0].given_name,
          person.rows[0].family_name,
          [person.rows[0].given_name, person.rows[0].family_name]
            .filter(Boolean)
            .join(" "),
        ].filter((name): name is string => Boolean(name))
      : [];

    return {
      requirements: items.rows.map((item) => ({
        label: item.label,
        state:
          item.state === "complete" || item.state === "ready"
            ? (item.state as "complete" | "ready")
            : "missing",
        linked: Boolean(item.work_id || item.file_id || item.saved_answer_id),
      })),
      ...(callProfile?.word_limit_max
        ? {
            wordLimit: {
              max: callProfile.word_limit_max,
              confidence: callProfile.confidence,
            },
          }
        : {}),
      ...(callProfile?.page_limit_max
        ? {
            pageLimit: {
              max: callProfile.page_limit_max,
              confidence: callProfile.confidence,
            },
          }
        : {}),
      blindReview,
      names,
      materials,
    };
  }
}
