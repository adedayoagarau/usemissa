/** Visual worlds are local previews; their links use canonical practice-family IDs. */
export const STUDIO_SCENES = [
  {
    id: "writing",
    label: "Writing",
    caption: "A place for your words.",
    description: "Literary magazines, fellowships, and open calls.",
    taxonomy: ["taxterm_pf-writing-and-literature"],
    alt: "A sunlit writing studio with a wooden desk, open notebook, books and a green chair.",
  },
  {
    id: "visual-art",
    label: "Visual art",
    caption: "A place for your vision.",
    description: "Exhibitions, commissions, and artist residencies.",
    taxonomy: ["taxterm_pf-visual-arts"],
    alt: "An art studio with a green and ochre painting on an easel, clay sculpture and pigment dishes.",
  },
  {
    id: "film",
    label: "Film",
    caption: "A place for your stories.",
    description: "Film festivals, funding, and open calls.",
    taxonomy: ["taxterm_pf-film-and-moving-image"],
    alt: "A film studio with a cinema camera on a tripod, a soft light and a green chair.",
  },
  {
    id: "music",
    label: "Music",
    caption: "A place for your sound.",
    description: "Music residencies, grants, and performance calls.",
    taxonomy: ["taxterm_pf-music-and-sound"],
    alt: "A music studio with a keyboard, acoustic guitar, microphone and music stand.",
  },
  {
    id: "performance",
    label: "Performance",
    caption: "A place for your presence.",
    description: "Theatre, dance, and live art opportunities.",
    taxonomy: [
      "taxterm_pf-theatre-and-dramatic-arts",
      "taxterm_pf-dance-and-choreography",
      "taxterm_pf-performance-and-live-art",
    ],
    alt: "An open rehearsal studio with a wooden rehearsal block and a dark green stage curtain.",
  },
  {
    id: "design",
    label: "Design",
    caption: "A place for your ideas.",
    description: "Design commissions, awards, and open calls.",
    taxonomy: ["taxterm_pf-design"],
    alt: "A design studio with paper maquettes, wooden prototypes, material samples and a task lamp.",
  },
] as const;

export type StudioId = (typeof STUDIO_SCENES)[number]["id"];
export const STUDIO_MOTION_MS = 280;
export const studioImage = (id: StudioId, mobile = false) =>
  `/homepage/studio/v1/${id}-${mobile ? "mobile" : "desktop"}.webp`;
export function studioHref(scene: (typeof STUDIO_SCENES)[number]) {
  const params = new URLSearchParams();
  scene.taxonomy.forEach((id) => params.append("taxonomy", id));
  return `/opportunities?${params.toString()}`;
}
