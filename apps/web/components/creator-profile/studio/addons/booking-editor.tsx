"use client";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function BookingEditor(_props: AddonEditorProps) {
  return <p>This editor is being built.</p>;
}

export const bookingEditor: AddonEditorDefinition = {
  Editor: BookingEditor,
  count: (draft) => draft.booking.files.length,
};
