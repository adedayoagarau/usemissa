import type { Metadata } from "next";
import { ComponentSheet } from "@/components/design-system/component-sheet";

export const metadata: Metadata = {
  title: "Component sheet · Missa design review",
  robots: { index: false, follow: false },
};

export default function ComponentSheetPage() {
  return <ComponentSheet />;
}
