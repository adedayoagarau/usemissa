#!/usr/bin/env bash

# Missa Vercel Build Blocker
# Blocks all automated Vercel git push builds unless explicitly requested via [vercel build]
# Exit code 0: CANCEL / SKIP build (Vercel skips the deployment without error or minutes used)
# Exit code 1: PROCEED with build

echo "[Vercel Ignore Step] Commit ref: ${VERCEL_GIT_COMMIT_REF:-unknown}"
echo "[Vercel Ignore Step] Commit message: ${VERCEL_GIT_COMMIT_MESSAGE:-unknown}"

# 1. Skip if commit message contains skip directives
if [[ "$VERCEL_GIT_COMMIT_MESSAGE" == *"[skip ci]"* || "$VERCEL_GIT_COMMIT_MESSAGE" == *"[ci skip]"* || "$VERCEL_GIT_COMMIT_MESSAGE" == *"[vercel skip]"* || "$VERCEL_GIT_COMMIT_MESSAGE" == *"[skip vercel]"* ]]; then
  echo "🛑 Skipped: commit message contains skip directive."
  exit 0
fi

# 2. Allow build ONLY if explicitly requested
if [[ "$VERCEL_GIT_COMMIT_MESSAGE" == *"[vercel build]"* || "$VERCEL_GIT_COMMIT_MESSAGE" == *"[build vercel]"* ]]; then
  echo "✅ Proceeding: build explicitly requested via commit message."
  exit 1
fi

# 3. Block all autobuilds by default
echo "🛑 Skipped: automated builds are blocked. Include [vercel build] in commit message to deploy."
exit 0
