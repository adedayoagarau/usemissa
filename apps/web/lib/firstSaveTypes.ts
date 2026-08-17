export type FirstSaveContext = {
  journeyId: string;
  opportunityId: string;
  slug: string;
  title: string;
  organizationName?: string;
  expiresAt: string;
};

export type FirstSaveMaterialChange = {
  code:
    | "status"
    | "deadline"
    | "fee"
    | "source"
    | "eligibility"
    | "destination"
    | "application-availability";
  label: string;
  before: string;
  after: string;
};

export type FirstSaveNextAction = {
  kind:
    | "review-requirements"
    | "check-deadline"
    | "check-fee"
    | "review-opportunity";
  label: string;
  description: string;
  href: string;
};

export type FirstSaveReceipt = {
  journeyId: string;
  accountId: string;
  opportunityId: string;
  title: string;
  organizationName?: string;
  result: "created" | "already-present";
  privateState: true;
  expiresAt: string;
  completionToken: string;
  nextAction: FirstSaveNextAction;
};

export type FirstSaveResumeResponse =
  | { status: "binding" }
  | { status: "created" | "already-present"; receipt: FirstSaveReceipt }
  | {
      status: "review-required";
      journeyId: string;
      opportunityId: string;
      title: string;
      organizationName?: string;
      currentFingerprint: string;
      changes: FirstSaveMaterialChange[];
      currentPath: string;
    }
  | {
      status: "blocked";
      opportunityId: string;
      title: string;
      reason: "closed" | "removed" | "unavailable";
      currentPath?: string;
    }
  | { status: "expired" | "missing"; restartPath?: string };
