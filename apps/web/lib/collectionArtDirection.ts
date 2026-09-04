/** Editorial cover treatments. Search definitions remain in discoveryGuides. */
export const collectionArtDirection: Record<
  string,
  {
    title: string;
    motif: "orbit" | "burst" | "steps" | "frame";
    editorial: boolean;
  }
> = {
  contests: { title: "Make your mark.", motif: "burst", editorial: false },
  magazines: { title: "Find your next page.", motif: "frame", editorial: true },
  poetry: { title: "Room for your words.", motif: "orbit", editorial: true },
  grants: { title: "Back your next idea.", motif: "steps", editorial: false },
  residencies: { title: "Space to make.", motif: "frame", editorial: true },
  fellowships: { title: "Go further.", motif: "orbit", editorial: false },
  "queer-lgbtq-opportunities": {
    title: "Create on your terms.",
    motif: "burst",
    editorial: false,
  },
  "bipoc-opportunities": {
    title: "Your work. Your voice.",
    motif: "frame",
    editorial: true,
  },
  "women-nonbinary-opportunities": {
    title: "Take up space.",
    motif: "orbit",
    editorial: true,
  },
  "disabled-neurodivergent-opportunities": {
    title: "More ways to create.",
    motif: "frame",
    editorial: false,
  },
  "emerging-writers-artists": {
    title: "This is a beginning.",
    motif: "steps",
    editorial: true,
  },
  "jobs-for-creators": {
    title: "Do work that matters.",
    motif: "steps",
    editorial: false,
  },
};
