import type { PortfolioWork } from "./creator-portfolio-schema";

/**
 * Words that already mean something after /@handle, so a work can't take them.
 * `cv` and `share.png` are routes today; the rest are held for the share kit.
 */
export const RESERVED_WORK_SLUGS = [
  "cv",
  "share",
  "story",
  "events",
  "event",
  "signature",
  "work",
  "works",
] as const;

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * The address of each work's page, in the creator's order. A slug the creator
 * set wins; otherwise it comes from the title. A word that is reserved or
 * already taken gets a number, so every address on a profile is unique and
 * stable while the works around it are reordered.
 */
export function workSlugs(works: readonly PortfolioWork[]): string[] {
  const taken = new Set<string>(RESERVED_WORK_SLUGS);
  // Slugs a creator chose are honoured first, wherever the work sits.
  const chosen = works.map((work) => slugify(work.slug));
  for (const slug of chosen) if (slug) taken.add(slug);
  const used = new Set<string>();
  return works.map((work, index) => {
    const preferred = chosen[index];
    if (
      preferred &&
      !used.has(preferred) &&
      !RESERVED_WORK_SLUGS.includes(preferred as never)
    ) {
      used.add(preferred);
      return preferred;
    }
    const base =
      slugify(work.title) || slugify(work.id ?? "") || `work-${index + 1}`;
    let slug = base;
    for (let n = 2; taken.has(slug) || used.has(slug); n++)
      slug = `${base}-${n}`;
    used.add(slug);
    return slug;
  });
}

export function workSlug(work: PortfolioWork, works: readonly PortfolioWork[]) {
  const index = works.indexOf(work);
  return index < 0 ? slugify(work.title) : workSlugs(works)[index];
}

/** /@handle/<slug>, or undefined until the profile has a handle. */
export function workHref(
  handle: string,
  work: PortfolioWork,
  works: readonly PortfolioWork[],
) {
  const slug = workSlug(work, works);
  return handle && slug ? `/@${handle}/${slug}` : undefined;
}

/** Finds the work a /@handle/<slug> address names. */
export function workBySlug(works: readonly PortfolioWork[], slug: string) {
  const index = workSlugs(works).indexOf(slug);
  return index < 0 ? undefined : { work: works[index], index };
}

/** The works either side of one, for Previous and Next on a work page. */
export function workNeighbours(works: readonly PortfolioWork[], index: number) {
  return {
    previous: index > 0 ? works[index - 1] : undefined,
    next: index < works.length - 1 ? works[index + 1] : undefined,
  };
}
