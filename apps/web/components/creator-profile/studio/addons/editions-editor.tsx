"use client";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function EditionsEditor(_props: AddonEditorProps) {
  return <p>This editor is being built.</p>;
}

export const editionsEditor: AddonEditorDefinition = {
  Editor: EditionsEditor,
  count: (draft) => draft.editions.length,
};
