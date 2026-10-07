import { bookingEditor } from "./booking-editor";
import { collaboratorsEditor } from "./collaborators-editor";
import { editionsEditor } from "./editions-editor";
import { servicesEditor } from "./services-editor";
import { showsEditor } from "./shows-editor";
import { supportEditor } from "./support-editor";
import { teachingEditor } from "./teaching-editor";
import type { AddonEditorRegistry } from "./types";

/** Every add-on's studio editor, keyed by its module id. */
export const ADDON_EDITORS: AddonEditorRegistry = {
  editions: editionsEditor,
  shows: showsEditor,
  collaborators: collaboratorsEditor,
  booking: bookingEditor,
  services: servicesEditor,
  teaching: teachingEditor,
  support: supportEditor,
};

export type { AddonEditorProps } from "./types";
