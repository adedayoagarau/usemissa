import { redirect } from "next/navigation";

export const metadata = {
  title: "Tracker · Missa design review",
  robots: { index: false, follow: false },
};

export default function LegacyMyApplicationsPage() {
  redirect("/design-system/tracker-directions");
}
