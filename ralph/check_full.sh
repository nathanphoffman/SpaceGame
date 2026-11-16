#!/usr/bin/env bash
# The full gate: quality pass, merge, end of round. Everything must be clean, and the code-quality score must stay above the floor.
source "$(dirname "$0")/common.sh"
ensure_node
ensure_pg

if [ -f "$SLN" ]; then
  dotnet format "$SLN" whitespace --no-restore --verify-no-changes -v q
  dotnet build "$SLN" "${DOTNET_FLAGS[@]}" -warnaserror
  dotnet test "$SLN" --no-build "${DOTNET_FLAGS[@]}"
  # The API contract: building writes server/openapi.json; it must match what is committed.
  if [ -n "$(git status --porcelain -- server/openapi.json)" ]; then
    echo "server/openapi.json is out of date: build the solution and commit it"; exit 1
  fi
fi

# The web client is generated from the contract; it must match too.
if [ -f server/openapi.json ] && grep -q '"gen:api"' package.json; then
  npm run -s gen:api
  if [ -n "$(git status --porcelain -- lib/api/generated)" ]; then
    echo "lib/api/generated is out of date: run npm run gen:api and commit it"; exit 1
  fi
fi

npx tsc --noEmit
npm run -s lint
npm test --silent
npm run -s build

# Hard floor 85. The target is 90 or higher (see ralph/RULES.md); below 85 the gate fails and a fix session runs.
codequality . --quick --min-score 85
