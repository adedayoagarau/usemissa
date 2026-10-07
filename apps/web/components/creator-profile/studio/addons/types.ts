import type { ReactNode } from "react";
import type {
  PortfolioAddon,
  PortfolioData,
} from "@/lib/creator-portfolio-schema";
import type { EditorProps } from "../studio-editors";

/** What an add-on's editor receives from the studio. */
export type AddonEditorProps = EditorProps & {
  /** True when the draft lives in an account rather than on this device. */
  isAccount: boolean;
};

export type AddonEditorDefinition = {
  /** The form body. The studio supplies the heading, summary and switch-off. */
  Editor: (props: AddonEditorProps) => ReactNode;
  /** The figure shown beside the section in the rail; undefined shows none. */
  count: (draft: PortfolioData) => number | undefined;
};

export type AddonEditorRegistry = Record<PortfolioAddon, AddonEditorDefinition>;
