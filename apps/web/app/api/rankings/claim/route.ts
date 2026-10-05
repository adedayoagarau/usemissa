import { NextResponse } from "next/server";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legalContact";

/**
 * Magazine profile claims are not stored by Missa yet; there is no queue that
 * admins review. The endpoint does not read or log the request body, and it
 * points people to the contact address instead of returning a claim id.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: `Claims are handled by email. Write to ${LEGAL_CONTACT_EMAIL} from an address at your magazine's domain.`,
      contactEmail: LEGAL_CONTACT_EMAIL,
    },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}
