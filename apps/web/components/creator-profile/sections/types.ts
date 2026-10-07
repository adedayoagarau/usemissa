import type {
  PortfolioAddon,
  PortfolioData,
} from "@/lib/creator-portfolio-schema";

export type ProfileMode = "page" | "preview" | "embedded";

/** What every add-on section on the visitor page receives. */
export type AddonSectionProps = {
  /** Anchor for the section nav; absent outside the full page. */
  id?: string;
  portfolio: PortfolioData;
  /** Display name of the creator, never empty. */
  name: string;
  /** The creator's handle without the @, when one is claimed. */
  address: string;
  /** Heading level for the section title; its items use level + 1. */
  level: number;
  mode: ProfileMode;
  /** ISO date used to hide what has passed, so renders are repeatable. */
  today: string;
  /**
   * Whether a visitor can write to this creator (the message form is on, or a
   * public address is set). When false, leave out any "Enquire" style action.
   */
  canContact: boolean;
};

export type AddonSectionDefinition = {
  /** Whether the section has anything to show. Empty sections are left out. */
  filled: (portfolio: PortfolioData, today: string) => boolean;
  Section: (props: AddonSectionProps) => React.ReactNode;
};

export type AddonSectionRegistry = Record<
  PortfolioAddon,
  AddonSectionDefinition
>;
