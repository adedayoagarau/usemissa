import { parseProjectCreate } from "@/lib/writing-projects";
import { json, smallJson, writingSession } from "../_shared";

/** The signed-in creator's projects, most recently changed first. */
export async function GET(request: Request) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  try {
    return json({
      projects: await prepared.repository.listProjects(prepared.accountId),
    });
  } catch {
    return json({ error: "We could not load your projects. Try again." }, 500);
  }
}

/** Creates a project and its template's first pieces. Safe to retry with the same id. */
export async function POST(request: Request) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const parsed = parseProjectCreate(await smallJson(request));
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  try {
    const result = await prepared.repository.createProject(
      prepared.accountId,
      parsed,
    );
    if (result.kind === "created") {
      return json({ project: result.project, entries: result.entries }, 201);
    }
    if (result.kind === "exists") {
      return json({ project: result.project, entries: [] });
    }
    if (result.kind === "limit") {
      return json(
        {
          error:
            "You have as many projects as Missa keeps. Delete one to start another.",
        },
        409,
      );
    }
    return json({ error: "Project id is not valid." }, 400);
  } catch {
    return json({ error: "We could not create this project. Try again." }, 500);
  }
}
