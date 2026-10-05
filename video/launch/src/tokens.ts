import { Easing } from "remotion";

/**
 * Missa tokens used by the launch video. Values mirror DESIGN.md primitives and
 * the approved homepage marketing extension (citron + sky), so the film reads
 * as the same brand as the product.
 */
export const color = {
  white: "#ffffff",
  ink: "#171418", // neutral-900
  inkSecondary: "#45413d", // neutral-700
  inkMuted: "#74716d", // neutral-500
  border: "#e7e7e5", // neutral-200
  borderStrong: "#d4d3d0", // neutral-300
  surfaceSubtle: "#f7f7f7", // neutral-50
  forest: "#285649", // forest-600, primary action
  forestDeep: "#1d4037", // forest-700, accent-deep
  forestSubtle: "#e3ece8", // forest-100
  lichen: "#657547", // lichen-600, success
  lichenSubtle: "#eef1e8",
  ochre: "#78551e", // ochre-700, deadlines
  ochreSubtle: "#f5ecd9",
  citron: "#ddf45b", // homepage marketing highlight
  sky: "#c6e8f4", // homepage marketing workspace ground
} as const;

export const font = {
  editorial: "Newsreader, Georgia, serif",
  interface: "'Instrument Sans', system-ui, sans-serif",
  data: "'Fragment Mono', ui-monospace, monospace",
} as const;

export const ease = {
  /** DESIGN.md `enter`: new surfaces arriving. */
  enter: Easing.bezier(0.16, 1, 0.3, 1),
  /** DESIGN.md `standard`: state changes. */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Exits accelerate away. */
  exit: Easing.bezier(0.7, 0, 0.84, 0),
} as const;

export const shadow = {
  subtle: "0 1px 2px rgba(28, 24, 21, 0.05)",
  overlay: "0 16px 48px rgba(28, 24, 21, 0.14)",
  lifted: "0 30px 80px rgba(10, 20, 16, 0.35)",
} as const;
