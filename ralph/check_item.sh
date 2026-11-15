#!/usr/bin/env bash
# Quick check after every item. Usage: bash ralph/check_item.sh <core|server|web>
# Cheap on purpose: three workers share 6 GB. The full gate (lint, next build, everything) is ralph/check_full.sh.
source "$(dirname "$0")/common.sh"
area="${1:?area}"

dotnet_area() { # $1 = tests project folder, rest = other projects to build
  [ -f "$SLN" ] || { echo "no $SLN yet, skipping .NET"; return 0; }
  dotnet format "$SLN" whitespace --no-restore -v q 2>/dev/null || dotnet format "$SLN" whitespace -v q
  dotnet test "server/$1/SpaceGame.$1.csproj" "${DOTNET_FLAGS[@]}"
}

case "$area" in
  core) dotnet_area Core.Tests ;;
  server) ensure_pg; dotnet_area Server.Tests ;;
  web)
    ensure_node
    npx tsc --noEmit
    npx vitest run
    ;;
  *) echo "unknown area: $area"; exit 2 ;;
esac
