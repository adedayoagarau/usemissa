import { taxonomyTermById } from "@missa/taxonomy";

import type {
  LibraryFile,
  LibraryWork,
  ProfileSampleKind,
} from "../domain/types.js";

const MEDIUM_FAMILY_KIND = new Map<string, ProfileSampleKind>([
  ["Writing & literature", "text"],
  ["Film & moving image", "video"],
  ["Music & sound", "audio"],
  ["Visual arts", "image"],
  ["Photography", "image"],
  ["Craft & material arts", "image"],
  ["Architecture, spatial practice & public realm", "image"],
]);

function kindFromContentType(
  contentType?: string,
): ProfileSampleKind | undefined {
  if (!contentType) return undefined;
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (
    contentType.startsWith("text/") ||
    contentType === "application/pdf" ||
    contentType === "application/epub+zip"
  )
    return "text";
  return undefined;
}

/** Resolve once at publish time. The result is stored on the public snapshot. */
export function profileSampleKindForWork(
  work: LibraryWork,
  file?: LibraryFile,
): ProfileSampleKind | undefined {
  const primaryMedium = work.taxonomyAssignments
    ?.filter((assignment) => assignment.primary)
    .map((assignment) => taxonomyTermById(assignment.termId))
    .find((term) => term?.facet === "medium");
  if (primaryMedium) {
    for (const parentId of primaryMedium.broaderTermIds) {
      const family = taxonomyTermById(parentId)?.preferredLabel;
      if (family && MEDIUM_FAMILY_KIND.has(family))
        return MEDIUM_FAMILY_KIND.get(family);
    }
  }
  return kindFromContentType(file?.contentType);
}
