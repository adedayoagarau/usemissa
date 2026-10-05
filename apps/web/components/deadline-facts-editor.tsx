"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import type { OpportunityDeadlineFactsRecord } from "@missa/radar-adapters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  COMMON_TIME_ZONES,
  STAGE_OPTIONS,
  TIER_OPTIONS,
  draftToBody,
  emptyStage,
  emptyTier,
  recordToDraft,
  type DeadlineFactsDraft,
  type StageDraft,
  type TierDraft,
} from "@/lib/deadline-facts-editor";
import styles from "./deadline-facts-editor.module.css";

type LoadState = "loading" | "ready" | "unavailable";

function ZoneSelect({ id, value, disabled, onChange }: { id: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const zones: readonly string[] = COMMON_TIME_ZONES.includes(value as (typeof COMMON_TIME_ZONES)[number]) || !value ? COMMON_TIME_ZONES : [value, ...COMMON_TIME_ZONES];
  return (
    <NativeSelect id={id} className={styles.select} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      <NativeSelectOption value="">No time zone</NativeSelectOption>
      {zones.map((zone) => <NativeSelectOption key={zone} value={zone}>{zone.replace(/_/gu, " ")}</NativeSelectOption>)}
    </NativeSelect>
  );
}

/**
 * Edit an Opportunity's deadline, fee tiers and stages. Loads from and saves
 * to `endpoint` (GET/PUT) with an Idempotency-Key and the loaded revision; a
 * conflict keeps the person's edits and offers the latest version.
 */
export function DeadlineFactsEditor({
  endpoint,
  canEdit,
  showSourceUrl = false,
  savedLabel = "Dates saved.",
}: {
  endpoint: string;
  canEdit: boolean;
  /** Admins record the official page the correction came from. */
  showSourceUrl?: boolean;
  savedLabel?: string;
}) {
  const baseId = useId();
  const [load, setLoad] = useState<LoadState>("loading");
  const [loadMessage, setLoadMessage] = useState("");
  const [draft, setDraft] = useState<DeadlineFactsDraft>(() => recordToDraft(null));
  const [message, setMessage] = useState("");
  const [latest, setLatest] = useState<OpportunityDeadlineFactsRecord | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    fetch(endpoint, { headers: { accept: "application/json" } })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as OpportunityDeadlineFactsRecord & { error?: string };
        if (!active) return;
        if (!response.ok) {
          setLoad("unavailable");
          setLoadMessage(body.error ?? "Dates cannot be edited here right now.");
          return;
        }
        setDraft(recordToDraft(body));
        setLoad("ready");
      })
      .catch(() => {
        if (!active) return;
        setLoad("unavailable");
        setLoadMessage("Dates cannot be edited here right now.");
      });
    return () => {
      active = false;
    };
  }, [endpoint]);

  function updateTier(key: string, patch: Partial<TierDraft>) {
    setDraft((current) => ({ ...current, tiers: current.tiers.map((tier) => (tier.key === key ? { ...tier, ...patch } : tier)) }));
  }

  function updateStage(key: string, patch: Partial<StageDraft>) {
    setDraft((current) => ({ ...current, stages: current.stages.map((stage) => (stage.key === key ? { ...stage, ...patch } : stage)) }));
  }

  function save() {
    const built = draftToBody(draft);
    if ("error" in built) {
      setMessage(built.error);
      return;
    }
    setMessage("");
    setLatest(null);
    startTransition(async () => {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
          ...(draft.revision ? { "If-Match": `"${draft.revision}"` } : {}),
        },
        body: JSON.stringify(built.body),
      }).catch(() => null);
      const body = (await response?.json().catch(() => ({}))) as {
        error?: string;
        current?: OpportunityDeadlineFactsRecord;
        facts?: OpportunityDeadlineFactsRecord;
        deadlineChanged?: boolean;
      };
      if (response?.status === 409) {
        setLatest(body.current ?? null);
        setMessage(body.error ?? "These dates were changed by someone else. Your edits remain here.");
        return;
      }
      if (!response?.ok || !body.facts) {
        setMessage(body.error ?? "The dates could not be saved. Your edits remain here; try again.");
        return;
      }
      setDraft({ ...recordToDraft(body.facts), sourceUrl: draft.sourceUrl });
      setMessage(body.deadlineChanged ? `${savedLabel} The deadline change is now shown on the public page.` : savedLabel);
    });
  }

  if (load === "loading") return <p className={styles.note} role="status">Loading dates…</p>;
  if (load === "unavailable") return <p className={styles.note}>{loadMessage}</p>;

  const disabled = !canEdit || pending;

  return (
    <form className={styles.editor} onSubmit={(event) => { event.preventDefault(); save(); }}>
      <fieldset className={styles.group}>
        <legend>Deadline</legend>
        <div className={styles.row}>
          <div className={styles.cell}>
            <Label htmlFor={`${baseId}-date`}>Date</Label>
            <Input id={`${baseId}-date`} type="date" value={draft.deadlineDate} disabled={disabled} onChange={(event) => setDraft({ ...draft, deadlineDate: event.target.value })} />
          </div>
          <div className={styles.cell}>
            <Label htmlFor={`${baseId}-time`}>Closing time <span className={styles.optional}>(optional)</span></Label>
            <Input id={`${baseId}-time`} type="time" value={draft.deadlineTime} disabled={disabled} onChange={(event) => setDraft({ ...draft, deadlineTime: event.target.value })} />
          </div>
          <div className={styles.cell}>
            <Label htmlFor={`${baseId}-zone`}>Time zone</Label>
            <ZoneSelect id={`${baseId}-zone`} value={draft.deadlineTimezone} disabled={disabled} onChange={(value) => setDraft({ ...draft, deadlineTimezone: value })} />
          </div>
        </div>
        <p className={styles.note}>Changing the date records it as a correction, so people tracking this call see the previous date.</p>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Fee tiers</legend>
        {draft.tiers.length === 0 ? <p className={styles.note}>No fee tiers. Add one for each early, regular or late window.</p> : null}
        <ol className={styles.list}>
          {draft.tiers.map((tier, index) => (
            <li key={tier.key} className={styles.item}>
              <div className={styles.row}>
                <div className={styles.cell}>
                  <Label htmlFor={`${tier.key}-tier`}>Tier {index + 1}</Label>
                  <NativeSelect id={`${tier.key}-tier`} className={styles.select} value={tier.tier} disabled={disabled} onChange={(event) => updateTier(tier.key, { tier: event.target.value as TierDraft["tier"] })}>
                    {TIER_OPTIONS.map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}
                  </NativeSelect>
                </div>
                <div className={styles.cell}>
                  <Label htmlFor={`${tier.key}-label`}>Label</Label>
                  <Input id={`${tier.key}-label`} value={tier.label} maxLength={120} placeholder="Early bird deadline" disabled={disabled} onChange={(event) => updateTier(tier.key, { label: event.target.value })} />
                </div>
                <div className={styles.cell}>
                  <Label htmlFor={`${tier.key}-date`}>Closes on</Label>
                  <Input id={`${tier.key}-date`} type="date" required value={tier.closesOn} disabled={disabled} onChange={(event) => updateTier(tier.key, { closesOn: event.target.value })} />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.cell}>
                  <Label htmlFor={`${tier.key}-time`}>Closing time <span className={styles.optional}>(optional)</span></Label>
                  <Input id={`${tier.key}-time`} type="time" value={tier.closesTime} disabled={disabled} onChange={(event) => updateTier(tier.key, { closesTime: event.target.value })} />
                </div>
                <div className={styles.cell}>
                  <Label htmlFor={`${tier.key}-zone`}>Time zone</Label>
                  <ZoneSelect id={`${tier.key}-zone`} value={tier.timezone} disabled={disabled} onChange={(value) => updateTier(tier.key, { timezone: value })} />
                </div>
                <div className={styles.cell}>
                  <Label htmlFor={`${tier.key}-fee`}>Fee <span className={styles.optional}>(0 for no fee)</span></Label>
                  <div className={styles.feeRow}>
                    <Input id={`${tier.key}-fee`} inputMode="decimal" value={tier.fee} placeholder="25" disabled={disabled} onChange={(event) => updateTier(tier.key, { fee: event.target.value })} />
                    <Input aria-label={`Tier ${index + 1} currency`} className={styles.currency} value={tier.currency} maxLength={3} disabled={disabled} onChange={(event) => updateTier(tier.key, { currency: event.target.value.toUpperCase() })} />
                  </div>
                </div>
              </div>
              <div className={styles.itemFooter}>
                <div className={styles.cell}>
                  <Label htmlFor={`${tier.key}-confidence`}>Confidence</Label>
                  <NativeSelect id={`${tier.key}-confidence`} className={styles.select} value={tier.confidence} disabled={disabled} onChange={(event) => updateTier(tier.key, { confidence: event.target.value as TierDraft["confidence"] })}>
                    <NativeSelectOption value="confirmed">Confirmed by the source</NativeSelectOption>
                    <NativeSelectOption value="probable">Probable</NativeSelectOption>
                  </NativeSelect>
                </div>
                {canEdit ? (
                  <Button type="button" variant="ghost" disabled={pending} onClick={() => setDraft({ ...draft, tiers: draft.tiers.filter((item) => item.key !== tier.key) })}>
                    <Trash2 aria-hidden="true" />
                    Remove tier {index + 1}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        {canEdit ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => setDraft({ ...draft, tiers: [...draft.tiers, emptyTier({ timezone: draft.deadlineTimezone })] })}>
            <Plus aria-hidden="true" />
            Add fee tier
          </Button>
        ) : null}
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Stages</legend>
        {draft.stages.length === 0 ? <p className={styles.note}>No stages. Add letters of intent, shortlists, interviews or notification dates.</p> : null}
        <ol className={styles.list}>
          {draft.stages.map((stage, index) => (
            <li key={stage.key} className={styles.item}>
              <div className={styles.row}>
                <div className={styles.cell}>
                  <Label htmlFor={`${stage.key}-kind`}>Stage {index + 1}</Label>
                  <NativeSelect id={`${stage.key}-kind`} className={styles.select} value={stage.kind} disabled={disabled} onChange={(event) => updateStage(stage.key, { kind: event.target.value as StageDraft["kind"] })}>
                    {STAGE_OPTIONS.map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}
                  </NativeSelect>
                </div>
                <div className={styles.cell}>
                  <Label htmlFor={`${stage.key}-label`}>Label</Label>
                  <Input id={`${stage.key}-label`} value={stage.label} maxLength={120} placeholder="Results announced" disabled={disabled} onChange={(event) => updateStage(stage.key, { label: event.target.value })} />
                </div>
                <div className={styles.cell}>
                  <Label htmlFor={`${stage.key}-date`}>Date</Label>
                  <Input id={`${stage.key}-date`} type="date" required value={stage.dueOn} disabled={disabled} onChange={(event) => updateStage(stage.key, { dueOn: event.target.value })} />
                </div>
              </div>
              <div className={styles.itemFooter}>
                <div className={styles.cell}>
                  <Label htmlFor={`${stage.key}-time`}>Time <span className={styles.optional}>(optional)</span></Label>
                  <Input id={`${stage.key}-time`} type="time" value={stage.dueTime} disabled={disabled} onChange={(event) => updateStage(stage.key, { dueTime: event.target.value })} />
                </div>
                <div className={styles.cell}>
                  <Label htmlFor={`${stage.key}-zone`}>Time zone</Label>
                  <ZoneSelect id={`${stage.key}-zone`} value={stage.timezone} disabled={disabled} onChange={(value) => updateStage(stage.key, { timezone: value })} />
                </div>
                <div className={styles.cell}>
                  <Label htmlFor={`${stage.key}-confidence`}>Confidence</Label>
                  <NativeSelect id={`${stage.key}-confidence`} className={styles.select} value={stage.confidence} disabled={disabled} onChange={(event) => updateStage(stage.key, { confidence: event.target.value as StageDraft["confidence"] })}>
                    <NativeSelectOption value="confirmed">Confirmed by the source</NativeSelectOption>
                    <NativeSelectOption value="probable">Expected</NativeSelectOption>
                  </NativeSelect>
                </div>
                {canEdit ? (
                  <Button type="button" variant="ghost" disabled={pending} onClick={() => setDraft({ ...draft, stages: draft.stages.filter((item) => item.key !== stage.key) })}>
                    <Trash2 aria-hidden="true" />
                    Remove stage {index + 1}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        {canEdit ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => setDraft({ ...draft, stages: [...draft.stages, emptyStage({ timezone: draft.deadlineTimezone })] })}>
            <Plus aria-hidden="true" />
            Add stage
          </Button>
        ) : null}
      </fieldset>

      {showSourceUrl ? (
        <div className={styles.cell}>
          <Label htmlFor={`${baseId}-source`}>Official page for these dates <span className={styles.optional}>(optional)</span></Label>
          <Input id={`${baseId}-source`} type="url" value={draft.sourceUrl} disabled={disabled} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} />
        </div>
      ) : null}

      <p className={styles.message} role="status" aria-live="polite">{message}</p>
      <div className={styles.actions}>
        {canEdit ? (
          <Button type="submit" disabled={pending}>
            <Save aria-hidden="true" />
            {pending ? "Saving…" : "Save dates"}
          </Button>
        ) : (
          <p className={styles.note}>Read only</p>
        )}
        {latest ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => { setDraft(recordToDraft(latest)); setLatest(null); setMessage("Showing the latest version."); }}>
            <RefreshCw aria-hidden="true" />
            Load the latest version
          </Button>
        ) : null}
      </div>
    </form>
  );
}
