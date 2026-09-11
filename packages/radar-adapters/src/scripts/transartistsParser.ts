export interface TransArtistsProgram {
  entityId: string;
  slug: string;
  name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  studioInfo: string | null;
  accommodationInfo: string | null;
  technicalInfo: string | null;
  lat: number | null;
  lon: number | null;
  deadlines: string[];
}

export function parseTransArtistsPopup(html: string, entityId: string, lat?: number, lon?: number): TransArtistsProgram | null {
  const linkM = html.match(/href="\/en\/air\/([^"]+)"/i);
  const slug = linkM ? linkM[1] : `node_${entityId}`;

  const titleM = html.match(/<span class="field field--name-title[^"]*">([\s\S]*?)<\/span>/i)
    || html.match(/<h2>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
  let name = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : '';
  if (!name) name = slug.replace(/-/g, ' ');

  const webM = html.match(/field--name-field-website[\s\S]*?href="([^"]+)"/i)
    || html.match(/href="(https?:\/\/[^"]+)"[^>]*>[^<]*website/i);
  const website = webM ? webM[1] : null;

  const emailM = html.match(/<span class="u">([^<]+)<\/span>\s*\[at\]\s*<span class="d">([^<]+)<\/span>/i);
  const email = emailM ? `${emailM[1]}@${emailM[2]}` : null;

  const phoneM = html.match(/field--name-field-phone[\s\S]*?<div class="field__item[^"]*">([\s\S]*?)<\/div>/i);
  const phone = phoneM ? phoneM[1].replace(/<[^>]+>/g, '').trim() : null;

  const descM = html.match(/field--name-field-air-description[\s\S]*?<div class="field__item[^"]*">([\s\S]*?)<\/div>/i);
  const description = descM ? descM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;

  const studioM = html.match(/field--name-field-air-studio-information[\s\S]*?<div class="field__item[^"]*">([\s\S]*?)<\/div>/i);
  const studioInfo = studioM ? studioM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;

  const accM = html.match(/field--name-field-air-accomodation-info[\s\S]*?<div class="field__item[^"]*">([\s\S]*?)<\/div>/i);
  const accommodationInfo = accM ? accM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;

  const techM = html.match(/field--name-field-air-technical-information[\s\S]*?<div class="field__item[^"]*">([\s\S]*?)<\/div>/i);
  const technicalInfo = techM ? techM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;

  return {
    entityId,
    slug,
    name,
    website,
    email,
    phone,
    description,
    studioInfo,
    accommodationInfo,
    technicalInfo,
    lat: lat ?? null,
    lon: lon ?? null,
    deadlines: [],
  };
}
