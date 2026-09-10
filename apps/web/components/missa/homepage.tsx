import { Suspense } from "react";
import { HomepageStudio } from "./homepage-studio";
import { HomepageCollections, HomepageOpenings } from "./homepage-openings";

export function Homepage() {
  return (
    <HomepageStudio
      opportunities={
        <Suspense fallback={<HomepageCollections />}>
          <HomepageOpenings />
        </Suspense>
      }
    />
  );
}
