"use client";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function ServicesEditor(_props: AddonEditorProps) {
  return <p>This editor is being built.</p>;
}

export const servicesEditor: AddonEditorDefinition = {
  Editor: ServicesEditor,
  count: (draft) => draft.services.length,
};
