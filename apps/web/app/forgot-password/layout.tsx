import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Reset your Missa password",
  description:
    "Request a reset link for your Missa account so you can return to your saved opportunities and deadlines.",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
