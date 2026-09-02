#!/usr/bin/env node

import { readPublicationReviewPreview } from './publicationReview.js';

function valueAfter(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const practiceFamily = valueAfter('--practice-family') ?? 'Writing & literature';
  const limitValue = Number(valueAfter('--limit') ?? 500);
  const preview = await readPublicationReviewPreview(process.env.DATABASE_URL, {
    practiceFamily,
    limit: Number.isFinite(limitValue) ? limitValue : 500,
  });
  console.log(JSON.stringify(preview, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
