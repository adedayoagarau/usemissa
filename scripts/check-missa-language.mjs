#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const productRoots = ['apps/web/app', 'apps/web/components', 'apps/web/lib'];
const changedOnly = !process.argv.includes('--all');

const bannedPatterns = [
  { label: 'practice', pattern: /\bpractice(?:s| family| taxonomy| preferences)?\b/i },
  { label: 'creative field', pattern: /\bcreative field\b/i },
  { label: 'taxonomy architecture', pattern: /\b(?:facet|term ID|matching input)\b/i },
  { label: 'public taxonomy label Field', pattern: /(?:>|["'`])\s*field\b/i },
];

function gitDiff() {
  const args = ['diff', '--no-color', '--unified=0', '--', ...productRoots];
  return execFileSync('git', args, { encoding: 'utf8' });
}

function allProductFiles() {
  const output = execFileSync('rg', ['--files', ...productRoots], { encoding: 'utf8' });
  return output
    .split('\n')
    .filter(Boolean)
    .map((file) => {
      const contents = execFileSync('sed', ['-n', '1,$p', file], { encoding: 'utf8' });
      return contents
        .split('\n')
        .map((line, index) => `${file}:${index + 1}:${line}`)
        .join('\n');
    })
    .join('\n');
}

function customerTextFragments(line) {
  const fragments = [];
  const quoted = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/gu;
  for (const match of line.matchAll(quoted)) fragments.push(match[2]);

  const jsxText = />\s*([A-Za-z][^<{]*)</gu;
  for (const match of line.matchAll(jsxText)) fragments.push(match[1]);

  return fragments.filter((fragment) => {
    const value = fragment.trim();
    if (!value || /^[a-z0-9_:/?.${}()[\]+'" -]+$/u.test(value) && !/\s/u.test(value)) return false;
    if (/^(?:id|className|data-|aria-|href|src|key|value|type|name|variant|size|path|route|slug|prefix)/iu.test(value)) return false;
    return true;
  });
}

const source = changedOnly ? gitDiff() : allProductFiles();
const violations = [];

for (const line of source.split('\n')) {
  if (!line.startsWith('+') && changedOnly) continue;
  if (line.startsWith('+++')) continue;
  for (const fragment of customerTextFragments(line)) {
    for (const { label, pattern } of bannedPatterns) {
      if (pattern.test(fragment)) {
        violations.push(`${label}: ${line}`);
        break;
      }
    }
  }
}

if (violations.length) {
  console.error('Customer-facing Missa language check failed.');
  console.error('Use specific, contextual terms. Keep taxonomy IDs and legacy names out of rendered copy.');
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log(
  changedOnly
    ? 'Customer-facing Missa language check passed for changed product lines.'
    : 'Customer-facing Missa language check passed for the product source.',
);
