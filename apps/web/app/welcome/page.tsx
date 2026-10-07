import type { Metadata } from "next";
import { LiquidGlassWelcome } from "@/components/missa/liquid-glass-welcome";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Find the call. Make the deadline. Open calls, grants and residencies with the fee, the rules and a reminder before each one closes.",
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  return <LiquidGlassWelcome />;
}
