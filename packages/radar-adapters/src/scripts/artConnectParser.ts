export interface ArtConnectProfile {
  id: string;
  slug: string;
  name: string;
  organizationType: string;
  profileKind: "visual_arts_organization" | "residency_center" | "grant_foundation";
  website: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  country: string;
  city: string;
  about: string;
  profileImageUrl: string | null;
  headerImageUrl: string | null;
  artisticFields: string[];
  verifiedAt: string | null;
  artconnectUrl: string;
}

export function parseArtConnectPage(html: string): ArtConnectProfile[] {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[(\d+),([\s\S]*?)\]\)/g)];
  for (const ch of chunks) {
    if (ch[2].includes('profiles')) {
      try {
        const raw = JSON.parse(ch[2]);
        const startIdx = raw.indexOf('"profiles":{');
        if (startIdx !== -1) {
          const sub = raw.slice(startIdx + 11);
          let depth = 0;
          let endIdx = -1;
          for (let i = 0; i < sub.length; i++) {
            if (sub[i] === '{') depth++;
            else if (sub[i] === '}') {
              depth--;
              if (depth === 0) {
                endIdx = i + 1;
                break;
              }
            }
          }
          if (endIdx !== -1) {
            const parsed = JSON.parse(sub.slice(0, endIdx));
            const items = parsed.data || [];
            return items.map((o: any) => mapProfile(o));
          }
        }
      } catch (e) {}
    }
  }
  return [];
}

export function mapProfile(o: any): ArtConnectProfile {
  const orgType = (o.organizationType || "ORGANIZATION").toUpperCase();
  
  let profileKind: "visual_arts_organization" | "residency_center" | "grant_foundation" = "visual_arts_organization";
  if (orgType === "RESIDENCY" || o.organizationName?.toLowerCase().includes("residency")) {
    profileKind = "residency_center";
  } else if (orgType === "FOUNDATION" || o.organizationName?.toLowerCase().includes("foundation") || o.organizationName?.toLowerCase().includes("grant")) {
    profileKind = "grant_foundation";
  }

  const website = o.contact?.url ? (o.contact.url.startsWith("http") ? o.contact.url : `https://${o.contact.url}`) : null;
  const slug = o.id || o.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    id: o.id,
    slug,
    name: o.organizationName || "Art Organization",
    organizationType: orgType,
    profileKind,
    website,
    email: o.contact?.email || null,
    instagram: o.contact?.instagram || null,
    facebook: o.contact?.facebook || null,
    country: o.country || "Global",
    city: o.city || "",
    about: o.about || `${o.organizationName} is a visual arts organization indexed on ArtConnect.`,
    profileImageUrl: o.profileImageUrl || null,
    headerImageUrl: o.headerImageUrl || null,
    artisticFields: o.artisticFields || ["VISUAL_ARTS"],
    verifiedAt: o.verified || null,
    artconnectUrl: `https://www.artconnect.com/${o.id}`
  };
}
