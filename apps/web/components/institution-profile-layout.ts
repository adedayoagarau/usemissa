import type { ProfileKind } from "@missa/radar-adapters";

export type ProfileSection =
  "about" | "gallery" | "focus" | "opportunities" | "guidance";
type ProfileLayout = {
  order: ProfileSection[];
  about: string;
  focus: string;
  calls: string;
  guidance: string;
  media: string;
  signature: string;
};

export const PROFILE_LAYOUTS: Record<ProfileKind, ProfileLayout> = {
  literary_magazine: {
    order: ["about", "focus", "guidance", "opportunities"],
    about: "About the magazine",
    focus: "Editorial focus",
    calls: "Submission calls",
    guidance: "Submitting your work",
    media: "Past issues",
    signature: "Journals & literary magazines",
  },
  small_press: {
    order: ["about", "focus", "opportunities", "guidance"],
    about: "About the press",
    focus: "Publishing focus",
    calls: "Calls & opportunities",
    guidance: "Manuscript submissions",
    media: "Books",
    signature: "Independent publishing",
  },
  residency_center: {
    order: ["about", "gallery", "focus", "opportunities", "guidance"],
    about: "About the residency",
    focus: "Creative disciplines",
    calls: "Residency opportunities",
    guidance: "Planning your application",
    media: "Spaces & residency media",
    signature: "Space, time & creative practice",
  },
  grant_foundation: {
    order: ["about", "opportunities", "guidance", "focus"],
    about: "About the foundation",
    focus: "Areas of practice",
    calls: "Funding opportunities",
    guidance: "Application guidance",
    media: "Foundation media",
    signature: "Funding & creative support",
  },
  gallery: {
    order: ["about", "focus", "opportunities", "guidance"],
    about: "About the gallery",
    focus: "Artistic focus",
    calls: "Artist opportunities",
    guidance: "Working with the gallery",
    media: "Gallery media",
    signature: "Art & exhibitions",
  },
  visual_arts_organization: {
    order: ["about", "focus", "opportunities", "guidance"],
    about: "About the organization",
    focus: "Creative disciplines",
    calls: "Programs & opportunities",
    guidance: "Taking part",
    media: "Organization media",
    signature: "Art & creative community",
  },
  organization: {
    order: ["about", "opportunities", "focus", "guidance"],
    about: "About the organization",
    focus: "Areas of practice",
    calls: "Opportunities",
    guidance: "Application guidance",
    media: "Organization media",
    signature: "Creative community",
  },
};
