"use client";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function ShowsEditor(_props: AddonEditorProps) {
  return <p>This editor is being built.</p>;
}

export const showsEditor: AddonEditorDefinition = {
  Editor: ShowsEditor,
  count: (draft) => draft.shows.length,
};
