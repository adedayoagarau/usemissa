import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { countWords } from "@/lib/writing";
import { getWritingRepository } from "@/lib/writing-repository";

const headers = { "Cache-Control": "private, no-store" };

function stamp(iso: string) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** Every entry the creator has written, as one plain text file, oldest first. */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  const repository = getWritingRepository();
  if (!repository) {
    return NextResponse.json(
      {
        error: "Saving to your account is not available here.",
        unavailable: true,
      },
      { status: 503, headers },
    );
  }
  try {
    const entries = await repository.exportAll(session.account.id);
    const text = entries
      .map((entry) => {
        const words = countWords(entry.body);
        const heading = `Written ${stamp(entry.createdAt)} · last saved ${stamp(entry.updatedAt)} · ${words.toLocaleString("en")} ${words === 1 ? "word" : "words"}`;
        const title = entry.title.trim() ? `${entry.title.trim()}\n` : "";
        return `${title}${heading}\n\n${entry.body}`;
      })
      .join("\n\n* * *\n\n");
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(text ? `${text}\n` : "", {
      headers: {
        ...headers,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="missa-writing-${date}.txt"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "We could not prepare your download. Try again." },
      { status: 500, headers },
    );
  }
}
