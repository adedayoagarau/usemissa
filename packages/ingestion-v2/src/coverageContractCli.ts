#!/usr/bin/env node

import { readWritingCoverageContract } from './coverageContract.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  console.log(JSON.stringify(await readWritingCoverageContract(process.env.DATABASE_URL), null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
