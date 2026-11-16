# Shared helpers for the check scripts (sourced, not run). Runs in the checkout root.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
SLN=server/SpaceGame.sln

# node_modules is git-ignored, so every worktree installs its own copy the first time.
# next-env.d.ts is generated and git-ignored too; tsc needs it (CSS imports), so make it with `next typegen`.
ensure_node() {
  [ -d node_modules ] || npm ci --no-audit --no-fund --loglevel=error
  [ -f next-env.d.ts ] || npx next typegen >/dev/null
}

# Starts a local Postgres (sandbox only) and exports SPACEGAME_TEST_PG. Without one, Postgres tests skip themselves.
ensure_pg() {
  if ls /usr/lib/postgresql/*/bin/initdb >/dev/null 2>&1; then
    local db
    db="sg_$(printf %s "$(basename "$PWD")" | tr -c 'a-zA-Z0-9' '_')"
    SPACEGAME_TEST_PG="$(bash ralph/pg_up.sh "$db")"
    export SPACEGAME_TEST_PG
  else
    echo "note: no PostgreSQL here, the Postgres tests are skipped"
  fi
}

# dotnet build/test with low parallelism (the sandbox has 7 GB for three workers).
DOTNET_FLAGS=(-m:2 -nologo -v q -clp:ErrorsOnly)
