/**
 * Route-derived words are a snapshot of the static top-level segments in
 * apps/web/app. Keep planned public routes here too so a future route cannot
 * accidentally become a handle before the route is added to the router.
 */
export const ROUTE_RESERVED_HANDLE_WORDS = [
  "about",
  "admin",
  "api",
  "ask",
  "calendar",
  "design-system",
  "discover",
  "for-organizations",
  "guides",
  "home",
  "inbox",
  "import",
  "insights",
  "journals",
  "library",
  "login",
  "messages",
  "methodology",
  "my-submissions",
  "opportunities",
  "opportunities-preview",
  "org",
  "organization",
  "privacy",
  "profile",
  "publication-claim",
  "reviewer",
  "reviews",
  "signup",
  "submissions",
  "tracker",
  "waitlist",
  "workspace",
  "missa-public-profile",
  // Planned or explicitly protected public routes.
  "settings",
  "help",
  "support",
  "security",
  "legal",
  "terms",
  "status",
  "blog",
  "www",
  "mail",
  "missa",
] as const;

export const AUTHORITY_RESERVED_HANDLE_WORDS = [
  "official",
  "staff",
  "team",
  "moderator",
  "admin",
  "support",
] as const;

/**
 * A deliberately small safety list. A one-word publication can still be
 * reviewed and manually reserved, but it must never be auto-minted from a
 * name/domain agreement alone.
 */
export const COMMON_ENGLISH_HANDLE_WORDS = [
  "art",
  "arts",
  "book",
  "books",
  "chorus",
  "ecotone",
  "field",
  "grain",
  "house",
  "journal",
  "magazine",
  "press",
  "review",
  "story",
  "studio",
  "writers",
] as const;

export const RESERVED_HANDLE_WORDS = new Set<string>([
  ...ROUTE_RESERVED_HANDLE_WORDS,
  ...AUTHORITY_RESERVED_HANDLE_WORDS,
]);

export const COMMON_ENGLISH_HANDLE_WORD_SET = new Set<string>(
  COMMON_ENGLISH_HANDLE_WORDS,
);
