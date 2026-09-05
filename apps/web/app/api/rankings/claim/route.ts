import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSessionAccount(request.headers.get("cookie"));
    const body = await request.json().catch(() => ({}));

    const {
      profileId,
      magazineName,
      contactName,
      contactEmail,
      editorialRole,
      contributorPayDetails,
      feeWaiverPolicy,
      turnaroundCommitment,
      notes,
    } = body;

    if (!profileId || !contactEmail || !editorialRole) {
      return NextResponse.json(
        { error: "Please fill in all required verification fields." },
        { status: 400 }
      );
    }

    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid editorial contact email." },
        { status: 400 }
      );
    }

    // Log the claim request for platform administrators
    console.log("[Publication Claim Request]", {
      profileId,
      magazineName,
      contactName,
      contactEmail,
      editorialRole,
      contributorPayDetails,
      feeWaiverPolicy,
      turnaroundCommitment,
      notes,
      accountId: session?.account.id ?? "anonymous",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Verification claim submitted. Our curatorial team will review your masthead credentials within 2 business days.",
      claimId: `claim_${windowCrypto()}`,
    });
  } catch (err) {
    console.error("[POST /api/rankings/claim] Error processing claim:", err);
    return NextResponse.json(
      { error: "Failed to submit claim request. Please try again." },
      { status: 500 }
    );
  }
}

function windowCrypto() {
  return Math.random().toString(36).substring(2, 10);
}
