"use client";
import { ExternalLink } from "lucide-react";
import { TextField } from "../studio-editors";
import { LinkField } from "./fields";
import styles from "./addons.module.css";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";

/** One link to a patronage or tip page, clearly marked as leaving Missa. */
function SupportEditor({ draft, update }: AddonEditorProps) {
  const change = (patch: Partial<typeof draft.support>) =>
    update((current) => ({
      ...current,
      support: { ...current.support, ...patch },
    }));
  const { support } = draft;
  return (
    <>
      <div className={styles.leaves}>
        <ExternalLink aria-hidden="true" />
        <p>
          This link leaves Missa and opens in a new tab. Any payment happens on
          that site, not on Missa.
        </p>
      </div>
      <TextField
        label="Label"
        value={support.label}
        maxLength={80}
        placeholder="Support my next collection"
        hint="A short title for the link."
        onChange={(label) => change({ label })}
      />
      <LinkField
        label="Link"
        required
        value={support.url}
        placeholder="https://"
        hint="Your patronage or tip page, as a full web address. Nothing shows on your profile without it."
        onChange={(url) => change({ url })}
      />
      <TextField
        label="Note"
        value={support.note}
        maxLength={200}
        placeholder="Every supporter gets the first proof of the book."
        hint="A line under the link, like what supporters get."
        onChange={(note) => change({ note })}
      />
    </>
  );
}

export const supportEditor: AddonEditorDefinition = {
  Editor: SupportEditor,
  count: (draft) => (draft.support.url ? 1 : 0),
};
