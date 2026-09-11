export interface AcaOpenCall {
  url: string;
  slug: string;
  title: string;
  organizationName: string;
  programName: string;
  deadlineDate: string | null;
  applicationUrl: string | null;
  stipendAmount: number | null;
  travelStipend: number | null;
  residencyFee: number | null;
  applicationFee: number | null;
  isFullyFunded: boolean;
  isFreeToApply: boolean;
  housingType: string | null;
  mealsProvided: string | null;
  disciplines: string[];
  description: string;
  location: string | null;
}

export function parseAcaCallPage(html: string, pageUrl: string): AcaOpenCall | null {
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!titleMatch) return null;
  const title = titleMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');

  // Extract labeled fields
  const fieldMap = new Map<string, string>();
  const regex = /<div[^>]*class="[^"]*field__label[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*field__item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const label = match[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
    const val = match[2].replace(/<[^>]+>/g, ' ').trim().replace(/\s+/g, ' ');
    fieldMap.set(label, val);
  }

  const organizationName = fieldMap.get("organization") || title;
  const programName = fieldMap.get("associated residency program") || title;
  
  // Parse deadline
  let deadlineDate: string | null = null;
  const rawDeadline = fieldMap.get("deadline");
  if (rawDeadline) {
    const parsedTime = Date.parse(rawDeadline);
    if (!isNaN(parsedTime)) {
      deadlineDate = new Date(parsedTime).toISOString().slice(0, 10);
    }
  }

  // Application URL
  let applicationUrl: string | null = null;
  const appUrlMatch = html.match(/href="([^"]+)"[^>]*>[^<]*application/i) || html.match(/class="[^"]*field--name-field-url[^"]*"[\s\S]*?href="([^"]+)"/);
  if (appUrlMatch) {
    applicationUrl = appUrlMatch[1];
  } else {
    applicationUrl = fieldMap.get("url/web link to application") || null;
  }

  // Financials
  const rawStipend = fieldMap.get("artist stipend");
  const stipendAmount = rawStipend && !isNaN(parseFloat(rawStipend.replace(/[^0-9.]/g, ''))) 
    ? parseFloat(rawStipend.replace(/[^0-9.]/g, '')) 
    : null;

  const rawTravel = fieldMap.get("travel stipend/material stipends");
  const travelStipend = rawTravel && !isNaN(parseFloat(rawTravel.replace(/[^0-9.]/g, '')))
    ? parseFloat(rawTravel.replace(/[^0-9.]/g, ''))
    : null;

  const rawResFee = fieldMap.get("residency fees");
  const residencyFee = rawResFee && !isNaN(parseFloat(rawResFee.replace(/[^0-9.]/g, '')))
    ? parseFloat(rawResFee.replace(/[^0-9.]/g, ''))
    : null;

  const rawAppFee = fieldMap.get("application fee");
  const applicationFee = rawAppFee && !isNaN(parseFloat(rawAppFee.replace(/[^0-9.]/g, '')))
    ? parseFloat(rawAppFee.replace(/[^0-9.]/g, ''))
    : null;

  const isFullyFunded = residencyFee === 0 || (stipendAmount !== null && stipendAmount > 0);
  const isFreeToApply = applicationFee === 0;

  const housingType = fieldMap.get("type of housing") || null;
  const mealsProvided = fieldMap.get("meals provided") || null;
  const location = fieldMap.get("context") || null;

  // Description / Eligibility
  const description = fieldMap.get("additional eligibility information") 
    || fieldMap.get("additional expectations/opportunities")
    || `${title} offered by ${organizationName}.`;

  const disciplines: string[] = [];
  const rawDiscipline = fieldMap.get("discipline");
  if (rawDiscipline) disciplines.push(rawDiscipline);

  const slug = pageUrl.split("/").pop() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    url: pageUrl,
    slug,
    title,
    organizationName,
    programName,
    deadlineDate,
    applicationUrl,
    stipendAmount,
    travelStipend,
    residencyFee,
    applicationFee,
    isFullyFunded,
    isFreeToApply,
    housingType,
    mealsProvided,
    disciplines,
    description,
    location
  };
}
