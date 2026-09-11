export interface RivetOpenCall {
  url: string;
  slug: string;
  title: string;
  organizationName: string;
  organizationPath: string | null;
  location: string | null;
  country: string | null;
  deadlineDate: string | null;
  applicationUrl: string | null;
  costs: string | null;
  funding: string | null;
  facilities: string[];
  housing: string[];
  meals: string | null;
  disciplines: string[];
  description: string;
  duration: string | null;
}

export function parseRivetCallPage(html: string, pageUrl: string): RivetOpenCall | null {
  const slug = pageUrl.split("/").filter(Boolean).pop() || "";
  
  // Extract Title from single-header
  const headerM = html.match(/<header class="single-header">[\s\S]*?<h1>([\s\S]*?)<\/h1>/i);
  let title = headerM ? headerM[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ') : "";
  if (!title) {
    const cleanSlug = slug.replace(/^(copy-of-)+/gi, '').replace(/-/g, ' ');
    title = cleanSlug;
  }

  // Extract Host Organization from single-header
  const orgM = html.match(/<header class="single-header">[\s\S]*?<a href="(\/orgs\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    || html.match(/href="(\/orgs\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  const organizationName = orgM ? orgM[2].replace(/<[^>]+>/g, '').trim() : "Unknown Host";
  const organizationPath = orgM ? orgM[1] : null;

  // Extract Location
  let location: string | null = null;
  let country: string | null = null;
  const locM = html.match(/<div class="muted single-call-icons">[\s\S]*?<\/div>\s*<div>\s*([^\n<]+)/i) 
    || html.match(/No Funding\s*([^\n<]+)/i);
  if (locM) {
    location = locM[1].trim();
    const parts = location.split(",");
    if (parts.length > 1) {
      country = parts[parts.length - 1].trim();
    }
  }

  // Extract Labeled Sections
  const fieldMap = new Map<string, string>();
  const fieldRegex = /<div>\s*<h1>([^<]+)<\/h1>\s*([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = fieldRegex.exec(html)) !== null) {
    const label = m[1].trim().toLowerCase();
    const val = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    fieldMap.set(label, val);
  }

  // Extract Deadline from <time datetime="..."> or text
  let deadlineDate: string | null = null;
  const timeM = html.match(/<time datetime="([^"]+)"/i);
  if (timeM) {
    deadlineDate = timeM[1].slice(0, 10);
  } else if (fieldMap.has("deadline")) {
    const raw = fieldMap.get("deadline")!;
    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) {
      deadlineDate = new Date(parsed).toISOString().slice(0, 10);
    }
  }

  // Extract Costs & Funding
  const costs = fieldMap.get("costs") || null;
  const fundingM = html.match(/(Full Funding|Partial Funding|No Funding)/i);
  const funding = fundingM ? fundingM[1] : null;

  // Facilities, Housing, Meals
  const facilitiesRaw = fieldMap.get("facilities");
  const facilities = facilitiesRaw ? facilitiesRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const housingRaw = fieldMap.get("housing");
  const housing = housingRaw ? housingRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const meals = fieldMap.get("meals") || null;

  // Disciplines
  const discRaw = fieldMap.get("disciplines");
  const disciplines = discRaw ? discRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  // Program Description
  const description = fieldMap.get("program description") || "";
  const duration = fieldMap.get("duration") || null;

  // Application URL (extract links in description or org website fallback)
  let applicationUrl: string | null = null;
  const urlInDesc = description.match(/https?:\/\/[^\s"'<>\)]+/i);
  if (urlInDesc) {
    applicationUrl = urlInDesc[0];
  } else {
    applicationUrl = pageUrl;
  }

  return {
    url: pageUrl,
    slug,
    title,
    organizationName,
    organizationPath,
    location,
    country,
    deadlineDate,
    applicationUrl,
    costs,
    funding,
    facilities,
    housing,
    meals,
    disciplines,
    description,
    duration,
  };
}
