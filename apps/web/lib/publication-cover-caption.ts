/** Legacy visual labels can be alt text. Extract only explicit bibliographic text. */
export function publicationCoverCaption(label: string): {
  title: string;
  author?: string;
} {
  const quoted = label.match(
    /^cover\s+(?:of|for)\s+["“](.+?)["”]\s*,?\s*(?:by\s+(.+?)(?=,\s*(?:showing|which|featuring|depicting)|$))?/i,
  );
  if (quoted)
    return {
      title: quoted[1].replace(/[,\s]+$/, ""),
      author: quoted[2]?.replace(/[,.\s]+$/, ""),
    };
  // Plain issue titles are already suitable captions; descriptive image labels are not.
  if (
    label.length <= 120 &&
    !/\b(?:showing|depicting|features?|illustration|background|image of|cover of|cover for|photograph)\b/i.test(
      label,
    )
  ) {
    return { title: label };
  }
  return { title: "Cover preview" };
}
