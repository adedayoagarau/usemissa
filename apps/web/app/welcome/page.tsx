import type { Metadata } from "next";
import { LiquidGlassWelcome } from "@/components/missa/liquid-glass-welcome";

export const metadata: Metadata = {
  title: "Make room for what’s next",
  description:
    "Find opportunities, make space for your practice, and take your next step with Missa.",
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  return <LiquidGlassWelcome />;
}
