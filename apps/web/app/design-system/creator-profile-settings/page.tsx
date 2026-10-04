import { ProfileStudio } from "@/components/creator-profile/studio/profile-studio";
export const metadata = {
  title: "Portfolio settings design review",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sample } = await searchParams;
  return (
    <>
      <p className="bg-background px-6 py-3 text-sm text-muted-foreground">
        Settings design preview · sample account · no account data is accessed
      </p>
      <ProfileStudio
        ownerId="design-preview-only"
        seedWithSample={sample === "1"}
      />
    </>
  );
}
