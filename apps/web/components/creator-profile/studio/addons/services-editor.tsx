"use client";
import {
  createItemId,
  type PortfolioService,
} from "@/lib/creator-portfolio-schema";
import { ADDON_LIST_MAX } from "@/lib/creator-profile-addon-fields";
import { ItemList, TextField } from "../studio-editors";
import styles from "./addons.module.css";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";

/** What you offer, how long it usually takes and, if you like, what it costs. */
function ServicesEditor({ draft, update }: AddonEditorProps) {
  return (
    <ItemList<PortfolioService>
      items={draft.services}
      onChange={(services) => update((current) => ({ ...current, services }))}
      noun="service"
      max={ADDON_LIST_MAX.services}
      addLabel="Add service"
      empty="No services yet. Add what you offer, like commissioned poems or a day of teaching."
      titleOf={(service) => service.title}
      metaOf={(service) =>
        [service.timing, service.price].filter(Boolean).join(" · ")
      }
      create={() => ({
        id: createItemId("sv"),
        title: "",
        timing: "",
        price: "",
        note: "",
      })}
    >
      {(service, change) => (
        <>
          <TextField
            label="Title"
            required
            value={service.title}
            maxLength={120}
            placeholder="Commissioned poems"
            onChange={(title) => change({ title })}
          />
          <div className={styles.twoUp}>
            <TextField
              label="Typical timing"
              value={service.timing}
              maxLength={60}
              placeholder="3–4 weeks"
              onChange={(timing) => change({ timing })}
            />
            <TextField
              label="Price"
              value={service.price}
              maxLength={60}
              placeholder="From $400"
              hint="Leave it empty and no price shows."
              onChange={(price) => change({ price })}
            />
          </div>
          <TextField
            label="Note"
            value={service.note}
            maxLength={200}
            placeholder="For occasions, books and rooms."
            hint="Who it’s for, or what’s included."
            onChange={(note) => change({ note })}
          />
        </>
      )}
    </ItemList>
  );
}

export const servicesEditor: AddonEditorDefinition = {
  Editor: ServicesEditor,
  count: (draft) => draft.services.length,
};
