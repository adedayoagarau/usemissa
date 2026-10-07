/**
 * The only addresses a creator's profile ever frames. Kept in a module of its
 * own, with no imports, so next.config.ts can read it through the
 * content-security-policy builder without loading the portfolio schema.
 *
 * A film from any other host can only open as an ordinary link.
 */
export const VIDEO_EMBED_ORIGINS = [
  "https://www.youtube-nocookie.com",
  "https://player.vimeo.com",
] as const;
