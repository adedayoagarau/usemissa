// Rules behind `npm run check:language`. The messaging rules come from
// docs/missa-messaging.md; the taxonomy rules predate it.

export const productRoots = ['apps/web/app', 'apps/web/components', 'apps/web/lib', 'apps/web/content'];

// Long-form copy (guide articles and their metadata) is read whole, not as
// quoted strings in code.
export const proseFile = /^apps\/web\/content\/.*\.md$/u;

// Messaging rules skip internal and vendor surfaces. Taxonomy rules apply to
// every product file, as they always have.
const internalPath =
  /(?:^|\/)(?:design-system|shadcn-studio|ui|e2e|test|__tests__)\/|platform-?admin|\(admin\)|\/admin\/|analytics-contract|\.test\.[cm]?[jt]sx?$/iu;

export const allowMarker = 'missa-language-allow';

export const rules = [
  // Taxonomy language (docs/missa-content-quick-reference.md).
  { id: 'practice', scope: 'all', pattern: /\bpractice(?:s| family| taxonomy| preferences)?\b/i, fix: 'Say "what you make" or name the discipline.' },
  { id: 'creative field', scope: 'all', pattern: /\bcreative field\b/i, fix: 'Say "what you make".' },
  { id: 'taxonomy architecture', scope: 'all', pattern: /\b(?:facet|term ID|matching input)\b/i, fix: 'Keep taxonomy internals out of rendered copy.' },
  { id: 'public taxonomy label Field', scope: 'all', pattern: /(?:>|["'`])\s*field\b/i, fix: 'Say "what you make".' },

  // Messaging (docs/missa-messaging.md, "Words").
  { id: 'opportunity layer', scope: 'messaging', pattern: /\bopportunity layer\b/i, fix: 'Strategy language. Say what Missa does: "Find the call. Make the deadline."' },
  { id: 'infrastructure', scope: 'messaging', pattern: /\binfrastructure\b/i, fix: 'Say what it does for the person.' },
  { id: 'capability', scope: 'messaging', pattern: /\bcapabilit(?:y|ies)\b/i, fix: 'Say what works today and what doesn\'t yet.' },
  { id: 'operate', scope: 'messaging', pattern: /\boperat(?:e|es|ing)\b/i, fix: 'Say "run", "post", "read" or "answer".' },
  { id: 'per-Work', scope: 'messaging', pattern: /\bper-Work\b/, fix: 'Say "each piece".' },
  { id: 'tailored for you', scope: 'messaging', pattern: /\btailored (?:for|to) you\b/i, fix: 'Say why it fits: "picked for what you make".' },
  { id: 'smart', scope: 'messaging', pattern: /\bsmart\b/i, fix: 'Name what the tool does instead.' },
  { id: 'sparkles emoji', scope: 'messaging', pattern: /✨/u, fix: 'Reads as AI. Drop it.' },
  { id: 'odds', scope: 'messaging', pattern: /\bodds\b/i, fix: 'Missa never predicts acceptance.' },
  { id: 'AI-powered', scope: 'messaging', pattern: /\bAI[- ](?:powered|driven)\b/i, fix: 'Missa never markets AI.' },
  { id: 'filler verbs', scope: 'messaging', pattern: /\b(?:journey|unlock(?:s|ed)?|seamless(?:ly)?|effortless(?:ly)?|elevate|leverage|ecosystem)\b/i, fix: 'Use a plain verb a person would say.' },
  { id: 'brings them together', scope: 'messaging', pattern: /\bbrings? (?:them|it all|everything) together\b/i, fix: 'Be specific: where calls turn up, and what Missa keeps.' },
  { id: 'content creator', scope: 'messaging', pattern: /\bcontent creators?\b/i, fix: 'Say "writers, artists, filmmakers", or "you".' },
  { id: 'every creator', scope: 'messaging', pattern: /\b(?:every|all) creators?\b|\bcreators and organi[sz]ations\b/i, fix: 'Say "For writers, artists, filmmakers, and everyone in between."' },
  { id: 'capitalized domain noun', scope: 'messaging', pattern: /\b(?:the|a|an|each|every|this|that|your|our|per|one|any)\s+(?:Opportunit(?:y|ies)|Organi[sz]ations?|Works?|Submissions?)\b|\b[A-Z][a-z]+ (?:Opportunit(?:y|ies)|Organi[sz]ations)\b/, fix: 'Use sentence case: "Browse open calls", "the organization".' },
];

export function isInternalPath(file) {
  return internalPath.test(file);
}

// Strings and JSX text on a line that a person might read.
export function customerTextFragments(line) {
  const fragments = [];
  const quoted = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/gu;
  for (const match of line.matchAll(quoted)) fragments.push(match[2]);

  const jsxText = />\s*([A-Za-z][^<{]*)</gu;
  for (const match of line.matchAll(jsxText)) fragments.push(match[1]);

  return fragments.filter((fragment) => {
    const value = fragment.trim();
    if (!value || /^[a-z0-9_:/?.${}()[\]+'" -]+$/u.test(value) && !/\s/u.test(value)) return false;
    if (/^(?:id|className|data-|aria-|href|src|key|value|type|name|variant|size|path|route|slug|prefix)/iu.test(value)) return false;
    // Paths, URLs and dotted keys such as "journey.abandoned" aren't copy.
    if (/^(?:\/|@\/|\.{1,2}\/|https?:)/u.test(value) || /^[\w$]+(?:[.:][\w$]+)+$/u.test(value)) return false;
    return true;
  });
}

// Every rule a line breaks, at most once per rule.
export function lineViolations(line, file = '') {
  if (line.includes(allowMarker) || /^\s*(?:import|export\s+\*|export\s+\{[^}]*\}\s+from)\b/u.test(line)) return [];
  // In prose every line is copy; link targets are not.
  const fragments = proseFile.test(file) ? [line.replace(/\]\([^)]*\)/gu, ']')] : customerTextFragments(line);
  if (!fragments.length) return [];
  const internal = isInternalPath(file);
  return rules.filter(
    (rule) => !(rule.scope === 'messaging' && internal) && fragments.some((fragment) => rule.pattern.test(fragment)),
  );
}
