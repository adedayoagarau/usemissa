import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : sourceFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

// NativeSelect renders its own <select>. A <select> passed as its child is
// invalid HTML: the browser drops it, and the dropdown shows no options.
test('NativeSelect is never given a nested <select>', () => {
  const offenders = [...sourceFiles('components'), ...sourceFiles('app')].filter((path) => /<NativeSelect\b[^>]*>\s*<select\b/.test(readFileSync(path, 'utf8')));
  assert.deepEqual(offenders, []);
});
