"use client";
import {
  SHOW_KINDS,
  createItemId,
  type PortfolioShow,
} from "@/lib/creator-portfolio-schema";
import {
  ADDON_LIST_MAX,
  SHOW_KIND_LABELS,
} from "@/lib/creator-profile-addon-fields";
import { ItemList, SelectField, TextField } from "../studio-editors";
import { LinkField, YearField } from "./fields";
import styles from "./addons.module.css";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";

/** A CV-style history of exhibitions, premieres and screenings. */
function ShowsEditor({ draft, update }: AddonEditorProps) {
  return (
    <ItemList<PortfolioShow>
      items={draft.shows}
      onChange={(shows) => update((current) => ({ ...current, shows }))}
      noun="show"
      max={ADDON_LIST_MAX.shows}
      addLabel="Add show"
      empty="No shows yet. Add an exhibition, premiere, screening or performance, with its year and venue."
      titleOf={(show) => show.title}
      metaOf={(show) =>
        [
          show.year,
          show.kind === "other" ? "" : SHOW_KIND_LABELS[show.kind],
          show.venue,
        ]
          .filter(Boolean)
          .join(" · ")
      }
      create={() => ({
        id: createItemId("sh"),
        year: String(new Date().getFullYear()),
        title: "",
        venue: "",
        kind: "other",
        url: "",
      })}
    >
      {(show, change) => (
        <>
          <TextField
            label="Title"
            required
            value={show.title}
            maxLength={200}
            placeholder="Indigo Hours"
            onChange={(title) => change({ title })}
          />
          <TextField
            label="Venue"
            value={show.venue}
            maxLength={200}
            placeholder="Saltmarsh Writers’ House, Fife"
            onChange={(venue) => change({ venue })}
          />
          <div className={styles.twoUp}>
            <YearField
              value={show.year}
              hint="Your profile groups shows by year."
              onChange={(year) => change({ year })}
            />
            <SelectField
              label="Kind"
              value={show.kind}
              options={SHOW_KINDS.map((value) => ({
                value,
                label: SHOW_KIND_LABELS[value],
              }))}
              onChange={(kind) => change({ kind })}
            />
          </div>
          <LinkField
            value={show.url}
            hint="Where visitors can read more. When set, the show links out."
            onChange={(url) => change({ url })}
          />
        </>
      )}
    </ItemList>
  );
}

export const showsEditor: AddonEditorDefinition = {
  Editor: ShowsEditor,
  count: (draft) => draft.shows.length,
};
