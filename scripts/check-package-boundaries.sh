#!/usr/bin/env bash
# Enforces the architecture doc's one-way dependency rule:
# packages/radar-engine must never import from packages/workspace-engine.
# (workspace-engine -> radar-engine is fine; the reverse is not.)
set -euo pipefail

if [ ! -d "packages/radar-engine/src" ]; then
  echo "packages/radar-engine/src not found — nothing to check."
  exit 0
fi

matches=$(grep -rnE "from ['\"](\.\./)*workspace-engine|require\(['\"](\.\./)*workspace-engine" packages/radar-engine/src 2>/dev/null || true)

if [ -n "$matches" ]; then
  echo "Boundary violation: packages/radar-engine imports from workspace-engine:"
  echo "$matches"
  echo ""
  echo "See _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md — this dependency direction is forbidden."
  exit 1
fi

echo "OK: no radar-engine -> workspace-engine imports found."
