export type OpportunityPresentation = "legacy" | "disclosure-v2";

type PresentationEnvironment = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  MISSA_OPPORTUNITIES_PRESENTATION?: string;
};

export function resolveOpportunityPresentation(
  environment: PresentationEnvironment = process.env,
): OpportunityPresentation {
  const configured = environment.MISSA_OPPORTUNITIES_PRESENTATION?.trim();
  if (configured === "legacy" || configured === "disclosure-v2") {
    return configured;
  }
  if (environment.VERCEL_ENV === "preview") return "disclosure-v2";
  if (environment.VERCEL_ENV === "production") return "legacy";
  return environment.NODE_ENV === "production" ? "legacy" : "disclosure-v2";
}
