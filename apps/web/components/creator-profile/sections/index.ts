import { bookingSection } from "./booking-section";
import { collaboratorsSection } from "./collaborators-section";
import { editionsSection } from "./editions-section";
import { servicesSection } from "./services-section";
import { showsSection } from "./shows-section";
import { supportSection } from "./support-section";
import { teachingSection } from "./teaching-section";
import type { AddonSectionRegistry } from "./types";

/** Every add-on's visitor section, keyed by its module id. */
export const ADDON_SECTIONS: AddonSectionRegistry = {
  editions: editionsSection,
  shows: showsSection,
  collaborators: collaboratorsSection,
  booking: bookingSection,
  services: servicesSection,
  teaching: teachingSection,
  support: supportSection,
};

export type { AddonSectionProps, ProfileMode } from "./types";
