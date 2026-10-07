"use client";
import {
  createItemId,
  type PortfolioTeaching,
} from "@/lib/creator-portfolio-schema";
import {
  ADDON_LIST_MAX,
  hasPassed,
  placesLeft,
  shortDate,
  todayIso,
} from "@/lib/creator-profile-addon-fields";
import { ItemList, TextField } from "../studio-editors";
import { CountField, DateField } from "./fields";
import styles from "./addons.module.css";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";

/** Workshops and classes with a date, a place and how many places are left. */
function TeachingEditor({ draft, update }: AddonEditorProps) {
  const today = todayIso();
  return (
    <ItemList<PortfolioTeaching>
      items={draft.teaching}
      onChange={(teaching) => update((current) => ({ ...current, teaching }))}
      noun="session"
      max={ADDON_LIST_MAX.teaching}
      addLabel="Add session"
      empty="No sessions yet. Add a workshop or class, with its date, place and how many places are left."
      titleOf={(session) => session.title}
      metaOf={(session) =>
        [
          hasPassed(session.date, today) ? "Passed" : "",
          shortDate(session.date),
          session.place,
          placesLeft(session.places),
        ]
          .filter(Boolean)
          .join(" · ")
      }
      create={() => ({
        id: createItemId("t"),
        title: "",
        date: "",
        place: "",
        note: "",
      })}
    >
      {(session, change) => (
        <>
          <TextField
            label="Title"
            required
            value={session.title}
            maxLength={200}
            placeholder="Relief printing, two days"
            onChange={(title) => change({ title })}
          />
          <DateField
            label="Date"
            value={session.date}
            today={today}
            hint="The session leaves your profile after this date."
            passedNote="This date has passed, so the session is hidden from your profile."
            onChange={(date) => change({ date })}
          />
          <div className={styles.twoUp}>
            <TextField
              label="Place"
              value={session.place}
              maxLength={120}
              placeholder="Lisbon"
              onChange={(place) => change({ place })}
            />
            <CountField
              label="Places left"
              value={session.places}
              placeholder="3"
              hint="Empty hides the count. 0 reads “Full”."
              onChange={(places) => change({ places })}
            />
          </div>
          <TextField
            label="Note"
            value={session.note}
            maxLength={300}
            placeholder="For writers who want to work from recordings."
            onChange={(note) => change({ note })}
          />
        </>
      )}
    </ItemList>
  );
}

export const teachingEditor: AddonEditorDefinition = {
  Editor: TeachingEditor,
  count: (draft) => draft.teaching.length,
};
