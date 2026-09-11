import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('canonical semantic tokens use the selected Forest direction', () => {
  assert.match(globals, /--brand-accent:\s*#285649;/i);
  assert.match(globals, /--primary:\s*var\(--brand-accent\);/);
  assert.match(globals, /--ring:\s*var\(--brand-accent\);/);
});

test('legacy Aubergine does not return to canonical token mappings', () => {
  assert.doesNotMatch(globals, /#5a3f68|#473050|#f1edf3/i);
});
