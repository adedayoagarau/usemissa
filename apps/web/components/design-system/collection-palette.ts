/**
 * The editorial collection palette as values, for renderers that cannot read
 * CSS variables, such as the generated guide share images. The source is
 * collection-palette.css beside this file; lib/collectionPalette.test.ts
 * fails if the two drift apart.
 */
export const COLLECTION_PALETTE = {
  contests: {
    surface: "#f3cc49",
    text: "#33270d",
    graphic: "#7d391c",
  },
  magazines: {
    surface: "#edeee8",
    text: "#253f36",
    graphic: "#6c7852",
  },
  poetry: {
    surface: "#e7dcf3",
    text: "#3e2853",
    graphic: "#765199",
  },
  grants: {
    surface: "#f5dfc4",
    text: "#54351e",
    graphic: "#9e5225",
  },
  residencies: {
    surface: "#163e35",
    text: "#f0f1db",
    graphic: "#b9cd89",
  },
  fellowships: {
    surface: "#d8e9ed",
    text: "#183e51",
    graphic: "#3b768c",
  },
  "queer-lgbtq-opportunities": {
    surface: "#f2d7cd",
    text: "#692e37",
    graphic: "#b44353",
  },
  "bipoc-opportunities": {
    surface: "#843c2d",
    text: "#fff0d8",
    graphic: "#edb971",
  },
  "women-nonbinary-opportunities": {
    surface: "#e0e5ff",
    text: "#243461",
    graphic: "#5267c8",
  },
  "disabled-neurodivergent-opportunities": {
    surface: "#d6e8d7",
    text: "#263e37",
    graphic: "#4b786b",
  },
  "emerging-writers-artists": {
    surface: "#e2ec9b",
    text: "#303c19",
    graphic: "#728332",
  },
  "jobs-for-creators": {
    surface: "#283b66",
    text: "#f1ebdf",
    graphic: "#c2cce8",
  },
} as const;

export type CollectionPaletteName = keyof typeof COLLECTION_PALETTE;
