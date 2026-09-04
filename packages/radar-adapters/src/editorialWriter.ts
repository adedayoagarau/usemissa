import {
  buildOpportunityContent,
  type OpportunityContent,
  type OpportunityContentBuildInput,
  type OpportunityContentEditorialDossier,
} from "@missa/radar-engine";

export interface OrganizationEditorialProfile {
  overview: string;
  demeanor: string;
  reputationSummary: string;
  notableAlumni?: string[];
  submissionGuidance: string;
  generatedAt: string;
  writerVersion: string;
}

export interface OrganizationEditorialInput {
  name: string;
  websiteUrl?: string;
  kind?: string;
  location?: string;
  rawDescription?: string;
  editorialFocus?: string;
  sampleCalls?: string[];
}

export interface EditorialWriterOptions {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function trimTo(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function cleanAiProse(text: string): string {
  return text
    .replace(/\b(?:as an ai|in conclusion|moreover|furthermore)\b/gi, "")
    .replace(/\b(?:an exciting opportunity|great opportunity|amazing chance|don't miss out)\b/gi, "an opportunity")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministic fallback for Organization Editorial Profile.
 */
export function buildDeterministicOrganizationEditorial(
  input: OrganizationEditorialInput,
): OrganizationEditorialProfile {
  const name = input.name.trim();
  const kindLabel = input.kind ? input.kind.replace(/_/g, " ") : "arts organization";
  const locationClause = input.location ? ` located in ${input.location}` : "";
  const focus = input.editorialFocus || input.rawDescription || "";
  
  let demeanor = "Independent & Contemporary";
  if (/university|college|academy|institute/i.test(name)) {
    demeanor = "Rigorous Academic & Research-Led";
  } else if (/residency|retreat|colony/i.test(name) || input.kind === "residency_center") {
    demeanor = "Contemplative Studio & Process-Oriented";
  } else if (/review|quarterly|press|journal/i.test(name) || input.kind === "literary_magazine" || input.kind === "small_press") {
    demeanor = "Discerning Literary & Craft-Focused";
  } else if (/foundation|fund|council|trust/i.test(name) || input.kind === "grant_foundation") {
    demeanor = "Civic Stewardship & Grantmaker";
  }

  const overview = focus.length >= 80
    ? trimTo(cleanAiProse(focus), 600)
    : `${name} is an active ${kindLabel}${locationClause} dedicated to supporting creative practitioners through competitive calls, institutional engagement, and public presentation.`;

  const reputationSummary = `${name} maintains an established profile in the cultural sector, recognized for its commitment to supporting artists through structured programs and dedicated resources.`;

  const submissionGuidance = `When applying to ${name}, anchor your materials around clear conceptual intent, practical feasibility, and why your work resonates with their specific curatorial scope. Avoid generic career retrospectives and follow all technical requirements strictly.`;

  return {
    overview,
    demeanor,
    reputationSummary,
    notableAlumni: [],
    submissionGuidance,
    generatedAt: new Date().toISOString(),
    writerVersion: "editorial-org.v2",
  };
}

/**
 * Writes an Opportunity Editorial Dossier.
 * Uses DeepSeek/OpenAI if available, falling back seamlessly to deterministic curatorial synthesis.
 */
export async function writeOpportunityEditorial(
  input: OpportunityContentBuildInput,
  options: EditorialWriterOptions = {},
): Promise<OpportunityContent> {
  // 1. Build deterministic base (guarantees truth and fallback)
  const baseContent = buildOpportunityContent(input);

  const apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return baseContent;
  }

  const endpoint = options.endpoint || (process.env.DEEPSEEK_API_KEY ? "https://api.deepseek.com/chat/completions" : "https://api.openai.com/v1/chat/completions");
  const model = options.model || (process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "gpt-4o-mini");
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const systemPrompt = `You are Missa's Senior Curatorial Editor. Missa is a premium, discerning platform for creative practitioners (visual artists, writers, filmmakers, performers).
Write an editorial dossier for this creative opportunity using ONLY the verified facts provided.
Strict Rules:
1. NEVER invent or alter deadlines, fees, locations, prizes, or submission links.
2. Tone: Serious, literate, respectful of the artist's time, discerning (like an editor at Artforum, Aperture, or The Paris Review).
3. Forbid promotional fluff or boosterism ("amazing opportunity", "exciting chance", "don't miss out", "great way to get published").
4. Output valid JSON with:
   - "editorialHook": (string) 1 concise sentence summarizing the call.
   - "curatorialOverview": (string) 2-3 articulate paragraphs explaining the context, institutional scope, what artists receive, and the curatorial vision.
   - "targetAudience": object with "careerStages" (array of "emerging", "mid-career", or "established") and "idealCandidate" (string describing aesthetic/medium fit).
   - "thematicFocus": (string) key themes or disciplines sought.
   - "insiderTips": (array of 2-3 strings) practical, insider advice on how to submit a competitive application for this jury.`;

    const userPrompt = JSON.stringify({
      title: input.title,
      organization: input.organizationName || "Unknown",
      type: input.type,
      discipline: input.discipline || null,
      genres: input.genres,
      deadline: input.deadline,
      fee: input.fee,
      prize: input.prize || null,
      location: input.location || null,
      descriptionExcerpt: input.description?.slice(0, 1000) || null,
      guidelinesExcerpt: input.guidelinesText?.slice(0, 1000) || null,
      materials: input.requiredMaterials,
    });

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return baseContent;
    }

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = json.choices?.[0]?.message?.content;
    if (!rawContent) return baseContent;

    const parsed = JSON.parse(rawContent) as {
      editorialHook?: string;
      curatorialOverview?: string;
      targetAudience?: {
        careerStages?: Array<"emerging" | "mid-career" | "established">;
        idealCandidate?: string;
      };
      thematicFocus?: string;
      insiderTips?: string[];
    };

    if (!parsed.curatorialOverview || parsed.curatorialOverview.length < 50) {
      return baseContent;
    }

    const editorialDossier: OpportunityContentEditorialDossier = {
      editorialHook: parsed.editorialHook ? trimTo(cleanAiProse(parsed.editorialHook), 240) : baseContent.editorialHook,
      curatorialOverview: cleanAiProse(parsed.curatorialOverview),
      targetAudience: parsed.targetAudience ?? baseContent.targetAudience,
      thematicFocus: parsed.thematicFocus ? trimTo(parsed.thematicFocus, 120) : baseContent.thematicFocus,
      insiderTips: Array.isArray(parsed.insiderTips) && parsed.insiderTips.length > 0
        ? parsed.insiderTips.map((tip) => trimTo(cleanAiProse(tip), 280))
        : baseContent.insiderTips,
      curatedChecklist: baseContent.curatedChecklist,
    };

    return {
      ...baseContent,
      builderVersion: "editorial-writer.v2",
      description: editorialDossier.curatorialOverview,
      editorialHook: editorialDossier.editorialHook,
      curatorialOverview: editorialDossier.curatorialOverview,
      targetAudience: editorialDossier.targetAudience,
      thematicFocus: editorialDossier.thematicFocus,
      insiderTips: editorialDossier.insiderTips,
      editorial: editorialDossier,
    };
  } catch {
    return baseContent;
  }
}

/**
 * Writes an Organization Editorial Profile.
 * Evaluates the institution's history, ethos, demeanor, and guidance.
 */
export async function writeOrganizationEditorial(
  input: OrganizationEditorialInput,
  options: EditorialWriterOptions = {},
): Promise<OrganizationEditorialProfile> {
  const baseProfile = buildDeterministicOrganizationEditorial(input);

  const apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return baseProfile;
  }

  const endpoint = options.endpoint || (process.env.DEEPSEEK_API_KEY ? "https://api.deepseek.com/chat/completions" : "https://api.openai.com/v1/chat/completions");
  const model = options.model || (process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "gpt-4o-mini");
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const systemPrompt = `You are Missa's Institutional Profile Editor. Write a refined, factual institutional profile for an arts or cultural organization.
Rules:
1. Ground tone in contemporary art & literary criticism (discerning, clear, respectful).
2. Forbid empty PR boilerplate. Focus on institutional ethos, curatorial demeanor, and practical guidance for applicants.
3. Output valid JSON with:
   - "overview": (string) 1-2 paragraphs on its history, founding ethos, and core mission.
   - "demeanor": (string) 3-5 word curatorial demeanor (e.g. "Experimental & Process-Oriented", "Rigorous Academic Fellowship").
   - "reputationSummary": (string) standing in the artistic ecosystem.
   - "notableAlumni": (array of strings, optional) notable past winners, fellows, or exhibiting artists if known from facts.
   - "submissionGuidance": (string) practical advice for artists approaching this organization.`;

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) return baseProfile;

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = json.choices?.[0]?.message?.content;
    if (!rawContent) return baseProfile;

    const parsed = JSON.parse(rawContent) as {
      overview?: string;
      demeanor?: string;
      reputationSummary?: string;
      notableAlumni?: string[];
      submissionGuidance?: string;
    };

    return {
      overview: parsed.overview ? cleanAiProse(parsed.overview) : baseProfile.overview,
      demeanor: parsed.demeanor ? trimTo(cleanAiProse(parsed.demeanor), 80) : baseProfile.demeanor,
      reputationSummary: parsed.reputationSummary ? cleanAiProse(parsed.reputationSummary) : baseProfile.reputationSummary,
      notableAlumni: Array.isArray(parsed.notableAlumni) ? parsed.notableAlumni : [],
      submissionGuidance: parsed.submissionGuidance ? cleanAiProse(parsed.submissionGuidance) : baseProfile.submissionGuidance,
      generatedAt: new Date().toISOString(),
      writerVersion: "editorial-org.v2",
    };
  } catch {
    return baseProfile;
  }
}
