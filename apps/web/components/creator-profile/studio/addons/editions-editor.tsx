"use client";
import {
  createItemId,
  type PortfolioEdition,
} from "@/lib/creator-portfolio-schema";
import {
  ADDON_LIST_MAX,
  editionStock,
  withEditionCounts,
} from "@/lib/creator-profile-addon-fields";
import { ItemList, MediaField, TextField } from "../studio-editors";
import { CountField, YearField } from "./fields";
import styles from "./addons.module.css";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";

/**
 * Prints and multiples: what each one is, how many exist and how many are
 * left. Enquiries only, so there is no price and no checkout.
 */
function EditionsEditor({ draft, update, upload, onError }: AddonEditorProps) {
  return (
    <ItemList<PortfolioEdition>
      items={draft.editions}
      onChange={(editions) => update((current) => ({ ...current, editions }))}
      noun="edition"
      max={ADDON_LIST_MAX.editions}
      addLabel="Add edition"
      empty="No editions yet. Add a print or multiple, with its edition size and how many are left."
      titleOf={(edition) => edition.title}
      metaOf={(edition) =>
        [edition.medium, edition.year, editionStock(edition)]
          .filter(Boolean)
          .join(" · ")
      }
      create={() => ({
        id: createItemId("ed"),
        title: "",
        image: "",
        medium: "",
        size: "",
        year: "",
        note: "",
      })}
    >
      {(edition, change) => (
        <>
          <MediaField
            label="Image"
            kind="image"
            value={edition.image}
            upload={upload}
            onError={onError}
            hint="JPG, PNG, WebP or GIF · up to 20 MB. Without one, the edition is set in type."
            onChange={(image) => change({ image })}
          />
          <TextField
            label="Title"
            required
            value={edition.title}
            maxLength={200}
            placeholder="Indigo Hours III"
            onChange={(title) => change({ title })}
          />
          <TextField
            label="Medium"
            value={edition.medium}
            maxLength={120}
            placeholder="Relief print"
            onChange={(medium) => change({ medium })}
          />
          <div className={styles.twoUp}>
            <TextField
              label="Size"
              value={edition.size}
              maxLength={80}
              placeholder="56 × 76 cm"
              onChange={(size) => change({ size })}
            />
            <YearField
              value={edition.year}
              hint="The year it was made."
              onChange={(year) => change({ year })}
            />
          </div>
          <div className={styles.twoUp}>
            <CountField
              label="Edition size"
              value={edition.total}
              placeholder="12"
              hint="Copies in the whole edition."
              onChange={(total) =>
                change(withEditionCounts(edition, { total }))
              }
            />
            <CountField
              label="Available"
              value={edition.available}
              max={edition.total}
              placeholder="4"
              hint={
                edition.available === 0
                  ? "Reads “Sold out” on your profile."
                  : "Copies left. Never more than the edition size."
              }
              cappedHint={`Capped at the edition size, ${edition.total}.`}
              onChange={(available) =>
                change(withEditionCounts(edition, { available }))
              }
            />
          </div>
          <TextField
            label="Note"
            value={edition.note}
            maxLength={200}
            placeholder="Printed by hand on cotton rag paper."
            onChange={(note) => change({ note })}
          />
        </>
      )}
    </ItemList>
  );
}

export const editionsEditor: AddonEditorDefinition = {
  Editor: EditionsEditor,
  count: (draft) => draft.editions.length,
};
