import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FirstSaveJourneyPrototype } from "@/components/design-system/first-save-journey-prototype/first-save-journey-prototype";

export const metadata: Metadata = {
  title: "First-Save journey prototype · Missa design review",
  description:
    "A local, in-memory prototype of the resumable first-Save journey.",
  robots: { index: false, follow: false },
};

export default function FirstSaveJourneyPrototypePage() {
  if (process.env.MISSA_ENABLE_FIRST_SAVE_PROTOTYPE !== "true") notFound();

  return <FirstSaveJourneyPrototype />;
}
