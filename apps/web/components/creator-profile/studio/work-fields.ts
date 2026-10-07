import type {
  PortfolioData,
  PortfolioWork,
} from "@/lib/creator-portfolio-schema";
import type { Upload } from "./studio-editors";

/** What the fields inside one work's editor row receive. */
export type WorkFieldsProps = {
  work: PortfolioWork;
  /** Every work, for fields that depend on the others (addresses, order). */
  works: PortfolioWork[];
  lens: PortfolioData["lens"];
  /** Claimed handle without the @, empty until the first publish. */
  handle: string;
  change: (patch: Partial<PortfolioWork>) => void;
  upload: Upload;
  onError: (message: string) => void;
};
