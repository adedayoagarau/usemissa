import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { designSystemRoutesPublic } from "@/lib/designSystemAccess";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Internal prototypes: not found in production unless explicitly enabled. */
export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  if (!designSystemRoutesPublic()) notFound();
  return children;
}
