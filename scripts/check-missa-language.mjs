#!/usr/bin/env node

// Checks customer-facing copy against docs/missa-messaging.md and the taxonomy
// language rules. By default only added or changed lines are checked, so legacy
// copy fails the first time someone edits it, never before.
//
//   node scripts/check-missa-language.mjs            changed lines (CI: the PR's own diff)
//   node scripts/check-missa-language.mjs --base X   changed lines since ref X
//   node scripts/check-missa-language.mjs --hook     one file, from a Claude Code hook on stdin
//   node scripts/check-missa-language.mjs --all      every product line; fails on any violation
//   node scripts/check-missa-language.mjs --report   every product line; counts per rule, never fails
//
// A line that must keep a flagged word (a quoted competitor, a legal name) can
// carry the comment `missa-language-allow: <reason>`.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { allowMarker, lineViolations, productRoots } from './missa-language-rules.mjs';

// Paths below are repo-relative, wherever the script is started from.
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const startDir = process.cwd();
process.chdir(repoRoot);

const args = process.argv.slice(2);
const mode = args.includes('--hook') ? 'hook' : args.includes('--report') ? 'report' : args.includes('--all') ? 'all' : 'changed';
const baseArg = args.includes('--base') ? args[args.indexOf('--base') + 1] : null;
const productFile = /\.(?:[cm]?[jt]sx?)$/u;

function git(gitArgs, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', gitArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function commitExists(ref) {
  return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { allowFailure: true }) !== null;
}

// The commit changed lines are measured from. In CI that's the PR's base
// (actions/checkout needs fetch-depth: 2). Locally it's where this branch left
// origin/main, so committed and uncommitted work are both checked.
function diffBase() {
  if (baseArg) return baseArg;
  if (process.env.GITHUB_ACTIONS) {
    if (commitExists('HEAD^1')) return 'HEAD^1';
    console.error('check:language could not find the base commit. Set fetch-depth: 2 on actions/checkout.');
    process.exit(1);
  }
  for (const ref of ['origin/main', 'main']) {
    if (!commitExists(ref)) continue;
    const mergeBase = git(['merge-base', 'HEAD', ref], { allowFailure: true });
    if (mergeBase) return mergeBase.trim();
  }
  return 'HEAD';
}

// [file, line] pairs for lines added since `base`, plus every line of untracked files.
function changedLines(base, pathspecs, { includeWorkingTree }) {
  const diffArgs = ['diff', '--no-color', '--unified=0', base];
  if (!includeWorkingTree) diffArgs.push('HEAD');
  const diff = git([...diffArgs, '--', ...pathspecs]);
  const lines = [];
  let file = '';
  let lineNumber = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw.startsWith('+++ b/') ? raw.slice(6) : '';
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/u.exec(raw);
    if (hunk) {
      lineNumber = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith('+') && file) {
      if (productFile.test(file)) lines.push([`${file}:${lineNumber}`, raw.slice(1)]);
      lineNumber += 1;
    }
  }
  if (includeWorkingTree) {
    const untracked = git(['ls-files', '--others', '--exclude-standard', '--', ...pathspecs]).split('\n').filter(Boolean);
    for (const file of untracked) {
      if (!productFile.test(file) || !existsSync(file)) continue;
      readFileSync(file, 'utf8').split('\n').forEach((line, index) => lines.push([`${file}:${index + 1}`, line]));
    }
  }
  return lines;
}

function allProductLines() {
  const files = execFileSync('rg', ['--files', ...productRoots], { encoding: 'utf8' }).split('\n').filter((file) => productFile.test(file));
  return files.flatMap((file) => readFileSync(file, 'utf8').split('\n').map((line, index) => [`${file}:${index + 1}`, line]));
}

function hookTarget() {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return null;
  }
  const filePath = input.tool_input?.file_path ?? input.tool_response?.filePath;
  if (!filePath) return null;
  const relative = path.relative(repoRoot, path.resolve(startDir, filePath)).split(path.sep).join('/');
  if (relative.startsWith('..') || !productFile.test(relative)) return null;
  if (!productRoots.some((root) => relative === root || relative.startsWith(`${root}/`))) return null;
  return relative;
}

function scan(lines) {
  const violations = [];
  for (const [where, line] of lines) {
    const file = where.replace(/:\d+$/u, '');
    for (const rule of lineViolations(line, file)) violations.push({ rule, where, line: line.trim() });
  }
  return violations;
}

function printViolations(violations, stream) {
  stream('Customer-facing Missa language check failed. See docs/missa-messaging.md.');
  for (const { rule, where, line } of violations) {
    stream(`  ${where}  [${rule.id}] ${rule.fix}`);
    stream(`    ${line.length > 160 ? `${line.slice(0, 157)}...` : line}`);
  }
  stream(`To keep a flagged word on purpose, add the comment "${allowMarker}: <reason>" to that line.`);
}

if (mode === 'report') {
  const violations = scan(allProductLines());
  const counts = new Map();
  for (const { rule } of violations) counts.set(rule.id, (counts.get(rule.id) ?? 0) + 1);
  console.log(`Missa language debt: ${violations.length} lines across ${new Set(violations.map((v) => v.where.replace(/:\d+$/u, ''))).size} files.`);
  for (const [id, count] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(count).padStart(5)}  ${id}`);
  process.exit(0);
}

if (mode === 'hook') {
  const target = hookTarget();
  if (!target) process.exit(0);
  let violations = [];
  try {
    violations = scan(changedLines(diffBase(), [target], { includeWorkingTree: true }));
  } catch {
    // A hook should never block an edit over its own git trouble; CI still checks.
    process.exit(0);
  }
  if (violations.length) {
    printViolations(violations, (message) => console.error(message));
    process.exit(2);
  }
  process.exit(0);
}

const violations = mode === 'all' ? scan(allProductLines()) : scan(changedLines(diffBase(), productRoots, { includeWorkingTree: !process.env.GITHUB_ACTIONS }));

if (violations.length) {
  printViolations(violations, (message) => console.error(message));
  process.exit(1);
}

console.log(
  mode === 'all'
    ? 'Customer-facing Missa language check passed for the product source.'
    : 'Customer-facing Missa language check passed for changed product lines.',
);
