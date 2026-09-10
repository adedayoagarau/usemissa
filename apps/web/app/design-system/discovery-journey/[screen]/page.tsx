import { notFound } from "next/navigation";
import Home from "@/app/design-system/homepage-hero/page";
import Opportunities from "@/app/opportunities/page";
import Rankings from "@/app/rankings/magazines/page";
import Directory from "@/app/directory/page";
import Compare from "@/app/rankings/compare/page";
import Methodology from "@/app/rankings/methodology/page";
import { CreatorOnboarding } from "@/components/creator-onboarding";
import { JourneyPreview, SignupPreview } from "@/components/design-system/discovery-journey-preview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Missa · Connected IA preview", robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: { params: Promise<{ screen: string }>; searchParams: Promise<Record<string,string>> }) {
  const { screen } = await params;
  const pages = {
    home: <Home />,
    opportunities: <Opportunities searchParams={searchParams} />,
    rankings: <Rankings searchParams={searchParams} />,
    directory: <Directory searchParams={searchParams} />,
    compare: <Compare searchParams={searchParams} />,
    methodology: <Methodology />,
    signup: <SignupPreview />,
    personalization: <CreatorOnboarding preview />,
  };
  if (!(screen in pages)) notFound();
  return <JourneyPreview screen={screen}>{pages[screen as keyof typeof pages]}</JourneyPreview>;
}
