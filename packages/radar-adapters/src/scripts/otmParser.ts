export interface OtmGrant {
  url: string;
  slug: string;
  title: string;
  organizationName: string;
  deadlineDate: string | null;
  applicationUrl: string | null;
  prize: string | null;
  disciplines: string[];
  description: string;
  location: string | null;
}

export function parseOtmGrantPage(html: string, pageUrl: string, listingDeadline?: string): OtmGrant | null {
  const titleM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!titleM) return null;
  const title = titleM[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');

  // Host Organization (usually before colon in title)
  let orgName = title.includes(":") ? title.split(":")[0].trim() : title;
  // Clean up leading words if any
  orgName = orgName.replace(/^(Call for|Open Call:|Grants?:?)/i, '').trim();

  // Application URL from apply button
  let applicationUrl: string | null = null;
  const applyMatch = html.match(/<a[^>]*href=['"]([^'"]+)['"][^>]*class=['"][^'"]*btn--apply[^'"]*['"]/i)
    || html.match(/<a[^>]*class=['"][^'"]*btn--apply[^'"]*['"][^>]*href=['"]([^'"]+)['"]/i)
    || html.match(/<a[^>]*href=['"]([^'"]+)['"][^>]*>[^<]*More info &amp; apply/i);
  
  if (applyMatch) {
    applicationUrl = applyMatch[1];
  }

  // Deadline
  let deadlineDate = listingDeadline || null;
  if (!deadlineDate) {
    const timeM = html.match(/<time datetime="([^"]+)"/);
    if (timeM) {
      deadlineDate = timeM[1].slice(0, 10);
    }
  }

  // Prize / Amount extraction
  let prize: string | null = null;
  const prizeMatch = html.match(/([0-9,]+(?:\.[0-9]+)?\s*(?:EUR|USD|GBP|€|\$|CHF))/i)
    || html.match(/((?:EUR|USD|GBP|€|\$)\s*[0-9,]+)/i)
    || html.match(/([0-9,]+\s*(?:euros|dollars|pounds))/i);
  if (prizeMatch) {
    prize = prizeMatch[0].trim();
  }

  // Disciplines
  const disciplines: string[] = ["visual-arts", "grant", "mobility"];
  if (html.toLowerCase().includes("performing arts") || html.toLowerCase().includes("theatre")) {
    disciplines.push("performing-arts");
  }
  if (html.toLowerCase().includes("music")) {
    disciplines.push("music");
  }
  if (html.toLowerCase().includes("literature") || html.toLowerCase().includes("writers")) {
    disciplines.push("literature");
  }

  // Description
  let description = title;
  const mainM = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (mainM) {
    const cleanText = mainM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    description = cleanText.slice(0, 1200);
  }

  const slug = pageUrl.split("/").pop() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    url: pageUrl,
    slug,
    title,
    organizationName: orgName,
    deadlineDate,
    applicationUrl,
    prize,
    disciplines,
    description,
    location: "International / Mobility"
  };
}
