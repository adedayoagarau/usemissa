import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { creatorOnboardingInputSchema } from "@missa/contracts";
import { processCreatorOnboarding } from "@missa/radar-engine";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);

    if (!session?.account.userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to complete creator onboarding." },
        { status: 401, headers: noStore }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400, headers: noStore }
      );
    }

    const parseResult = creatorOnboardingInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid onboarding data.",
          issues: parseResult.error.issues,
        },
        { status: 400, headers: noStore }
      );
    }

    const engine = await getEngine();
    const result = await processCreatorOnboarding(
      engine.store,
      session.account.userId,
      parseResult.data
    );

    await persistRadar();

    return NextResponse.json(result, { status: 200, headers: noStore });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process creator onboarding.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: noStore }
    );
  }
}
