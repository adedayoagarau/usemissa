#!/usr/bin/env bash

# Missa Vercel ignored build step
# Every push to main builds and deploys production, so the live site always
# matches main. Other branches build a preview only when the commit message
# asks for one with [vercel build].
# Exit code 0: CANCEL / SKIP build (Vercel skips the deployment without error or minutes used)
# Exit code 1: PROCEED with build

echo "[Vercel Ignore Step] Commit ref: ${VERCEL_GIT_COMMIT_REF:-unknown}"
echo "[Vercel Ignore Step] Environment: ${VERCEL_ENV:-unknown}"
echo "[Vercel Ignore Step] Commit message: ${VERCEL_GIT_COMMIT_MESSAGE:-unknown}"

# 1. main always builds: a merge that skipped its build would leave production
#    running older code than main.
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" || "$VERCEL_ENV" == "production" ]]; then
  echo "✅ Proceeding: every push to main deploys production."
  exit 1
fi

# 2. Other branches: skip directives win.
if [[ "$VERCEL_GIT_COMMIT_MESSAGE" == *"[skip ci]"* || "$VERCEL_GIT_COMMIT_MESSAGE" == *"[ci skip]"* || "$VERCEL_GIT_COMMIT_MESSAGE" == *"[vercel skip]"* || "$VERCEL_GIT_COMMIT_MESSAGE" == *"[skip vercel]"* ]]; then
  echo "🛑 Skipped: commit message contains skip directive."
  exit 0
fi

# 3. Other branches build a preview only when asked.
if [[ "$VERCEL_GIT_COMMIT_MESSAGE" == *"[vercel build]"* || "$VERCEL_GIT_COMMIT_MESSAGE" == *"[build vercel]"* ]]; then
  echo "✅ Proceeding: preview requested via commit message."
  exit 1
fi

echo "🛑 Skipped: previews are built only for commits containing [vercel build]."
exit 0
