import type { Metadata } from "next";
import { CreatorWorkspacePreview } from "@/components/creator-workspace-preview";

export const metadata: Metadata = { title: "Creator workspace · Missa", robots: { index: false, follow: false } };

export default function CreatorWorkspacePage() { return <CreatorWorkspacePreview />; }
