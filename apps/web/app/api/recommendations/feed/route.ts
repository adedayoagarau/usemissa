import { NextResponse } from "next/server";
import {
  generatePersonalizedFeed,
  type CandidateOpportunityLike,
  type WriterGenre,
  type WriterMatchingProfile,
} from "@missa/radar-engine";
import { getSessionAccount } from "@/lib/auth";
import { getEngine } from "@/lib/engine";

const VALID_GENRES: WriterGenre[] = [
  "Poetry",
  "Fiction",
  "Creative Nonfiction",
  "Essays",
  "Translation",
  "Flash Fiction",
  "Art",
  "Drama",
];

function parseWriterGenre(raw?: string | null): WriterGenre | undefined {
  if (!raw) return undefined;
  const match = VALID_GENRES.find((g) => g.toLowerCase() === raw.trim().toLowerCase());
  return match;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const genreParam = searchParams.get("genre");
    const feeModeParam = searchParams.get("fee_mode");
    const stateParam = searchParams.get("state");
    const categoryParam = searchParams.get("category");
    const cursorParam = searchParams.get("cursor") || undefined;
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;

    const session = await getSessionAccount(request.headers.get("cookie"));
    const engine = await getEngine();

    const userId = session?.account.userId;
    const user = userId ? engine.store.users.get(userId) : undefined;

    // Build writer matching profile from user settings or defaults
    const filteredGenre = parseWriterGenre(genreParam);
    let primaryGenres: WriterGenre[] = [];

    if (filteredGenre) {
      primaryGenres = [filteredGenre];
    } else if (user?.opportunityPreferences?.genres && user.opportunityPreferences.genres.length > 0) {
      primaryGenres = user.opportunityPreferences.genres
        .map((g) => parseWriterGenre(g))
        .filter((g): g is WriterGenre => Boolean(g));
    }

    if (primaryGenres.length === 0) {
      primaryGenres = [
        "Poetry",
        "Fiction",
        "Creative Nonfiction",
        "Essays",
        "Translation",
        "Flash Fiction",
        "Art",
        "Drama",
      ];
    }

    const feePreference =
      feeModeParam === "free_only"
        ? "free_only"
        : user?.opportunityPreferences?.noFeeOnly
        ? "free_only"
        : user?.opportunityPreferences?.maxFeeCents
        ? "low_fee_acceptable"
        : "any";

    const savedOpportunityIds = userId
      ? [...engine.store.tracked.values()]
          .filter((t) => t.userId === userId)
          .map((t) => t.opportunityId)
      : [];

    const submittedPublisherIds = userId
      ? [...engine.store.tracked.values()]
          .filter((t) => t.userId === userId && (t.myStatus === "submitted" || t.myStatus === "accepted" || t.myStatus === "declined" || t.myStatus === "in-review"))
          .map((t) => t.opportunityId)
      : [];

    const writerProfile: WriterMatchingProfile = {
      userId: userId || "anon_writer",
      primaryGenres,
      preferredFormats: ["Print", "Digital"],
      feePreference,
      maxFeeCents: user?.opportunityPreferences?.maxFeeCents,
      simultaneousSubmissionNeeded: user?.opportunityPreferences?.simultaneousRequired ?? true,
      savedOpportunityIds,
      submittedPublisherIds,
    };

    const allOpportunities: CandidateOpportunityLike[] = [
      ...engine.store.opportunities.values(),
    ];

    const feedResult = await generatePersonalizedFeed(allOpportunities, writerProfile, {
      category: categoryParam || undefined,
      genre: filteredGenre,
      feeMode: feeModeParam === "free_only" ? "free_only" : "all",
      state: stateParam || undefined,
      limit,
      cursor: cursorParam,
    });

    return NextResponse.json(feedResult, {
      headers: {
        "cache-control": session ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate recommendation feed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
