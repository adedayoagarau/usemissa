import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Choose a new Missa password",
  description:
    "Set a new password for your Missa account using the secure reset link from your email.",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
