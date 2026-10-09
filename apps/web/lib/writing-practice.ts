import { plainTextToDocument, type WritingDocument } from "./writing-document";
export type PracticeSession = {
  id: string;
  kind: "writing" | "revision";
  startedAt: number;
  endedAt: number | null;
  day: string;
};
export type WritingPracticeState = {
  version: 1;
  enabled: boolean;
  celebrateMilestones: boolean;
  intention: string;
  restDays: number[];
  sessions: PracticeSession[];
  milestones: { id: string; kind: "first-draft" | "revision"; day: string }[];
};
export const emptyWritingPractice = (): WritingPracticeState => ({
  version: 1,
  enabled: false,
  celebrateMilestones: false,
  intention: "",
  restDays: [],
  sessions: [],
  milestones: [],
});
export function practiceDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function practiceWeek(date = new Date()): string[] {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    return practiceDay(day);
  });
}
export function sessionElapsed(
  session: PracticeSession,
  now = Date.now(),
): number {
  return Math.max(0, (session.endedAt ?? now) - session.startedAt);
}
export function startPracticeSession(
  state: WritingPracticeState,
  kind: PracticeSession["kind"],
  now: number,
  id: string,
): WritingPracticeState {
  if (
    !state.enabled ||
    state.sessions.some((session) => session.endedAt === null)
  )
    return state;
  return {
    ...state,
    sessions: [
      {
        id,
        kind,
        startedAt: now,
        endedAt: null,
        day: practiceDay(new Date(now)),
      },
      ...state.sessions,
    ].slice(0, 365),
  };
}
export function endPracticeSession(
  state: WritingPracticeState,
  now: number,
): WritingPracticeState {
  return {
    ...state,
    sessions: state.sessions.map((session) =>
      session.endedAt === null
        ? { ...session, endedAt: Math.max(now, session.startedAt) }
        : session,
    ),
  };
}
export function readWritingPractice(raw: string | null): WritingPracticeState {
  try {
    const value = JSON.parse(
      raw ?? "null",
    ) as Partial<WritingPracticeState> | null;
    if (
      !value ||
      value.version !== 1 ||
      typeof value.enabled !== "boolean" ||
      typeof value.intention !== "string" ||
      !Array.isArray(value.restDays) ||
      !Array.isArray(value.sessions) ||
      !Array.isArray(value.milestones)
    )
      return emptyWritingPractice();
    return {
      version: 1,
      enabled: value.enabled,
      celebrateMilestones: value.celebrateMilestones === true,
      intention: value.intention.slice(0, 300),
      restDays: value.restDays.filter(
        (day) => Number.isInteger(day) && day >= 0 && day <= 6,
      ),
      sessions: value.sessions
        .filter(
          (session) =>
            session &&
            typeof session.id === "string" &&
            (session.kind === "writing" || session.kind === "revision") &&
            Number.isFinite(session.startedAt) &&
            (session.endedAt === null ||
              (Number.isFinite(session.endedAt) &&
                session.endedAt >= session.startedAt)) &&
            /^\d{4}-\d{2}-\d{2}$/.test(session.day),
        )
        .slice(0, 365),
      milestones: value.milestones
        .filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            (item.kind === "first-draft" || item.kind === "revision") &&
            /^\d{4}-\d{2}-\d{2}$/.test(item.day),
        )
        .slice(0, 100),
    };
  } catch {
    return emptyWritingPractice();
  }
}
export const WRITING_STARTING_GUIDES = [
  {
    id: "essay",
    title: "Essay",
    description: "Build an argument from a question and evidence.",
    text: "Working question\n\nWhat do I want to understand or argue?\n\nIntroduction\n\nMain claim\n\nEvidence and reasoning\n\nAnother perspective\n\nConclusion\n\nSources\n",
  },
  {
    id: "report",
    title: "Report",
    description: "Organize findings, methods and recommendations.",
    text: "Summary\n\nPurpose and scope\n\nMethod\n\nFindings\n\nDiscussion\n\nRecommendations\n\nReferences\n",
  },
  {
    id: "fiction",
    title: "Fiction",
    description: "Begin with a character, a want and a change.",
    text: "Working title\n\nCharacter\nWhat do they want? What stands in their way?\n\nOpening scene\n\nTurning point\n\nEnding\n",
  },
  {
    id: "screenplay",
    title: "Screenplay",
    description:
      "Letter paper, Courier 12 and scene prompts. Adjust element indents before export.",
    text: "Working title\n\nINT. LOCATION - DAY\n\nDescribe what we see and hear.\n\nCHARACTER\nDialogue goes here.\n\nEXT. LOCATION - NIGHT\n\nThe next scene.\n",
  },
  {
    id: "poetry",
    title: "Poetry",
    description: "Start from an image, a sound or a line.",
    text: "Working title\n\nAn image I keep returning to\n\nWords and sounds\n\nFirst lines\n\nRevision notes\n",
  },
  {
    id: "everyday",
    title: "Everyday writing",
    description: "Find the purpose, reader and next step.",
    text: "Who is this for?\n\nWhat do they need to know?\n\nDraft\n\nWhat should happen next?\n",
  },
] as const;

/** A starting document, with page settings rather than a production screenplay paginator. */
export function writingStartingGuideDocument(
  id: (typeof WRITING_STARTING_GUIDES)[number]["id"],
  fallbackTypeface = "newsreader",
): WritingDocument {
  const guide = WRITING_STARTING_GUIDES.find((item) => item.id === id);
  if (!guide) throw new Error("Unknown writing guide");
  const doc = plainTextToDocument(
    guide.text,
    id === "screenplay" ? "courier-prime" : fallbackTypeface,
  );
  if (id === "screenplay") {
    doc.pageSize = "letter";
    doc.textSize = 12;
    doc.pages[0].format = {
      ...doc.pages[0].format,
      lineHeight: 1,
      margins: { left: 38.1, right: 25.4, top: 25.4, bottom: 25.4 },
    };
  }
  return doc;
}
