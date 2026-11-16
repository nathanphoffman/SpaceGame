#!/usr/bin/env bash
# Local play: Postgres (Docker), the .NET server on :5000 and Next on :3000.
# Press Ctrl+C once and everything stops, Postgres included.
set -uo pipefail
cd "$(dirname "$0")/.."

DB_URL="Host=localhost;Port=5440;Database=spacegame;Username=space;Password=space"
API_URL="http://localhost:5000"

if ss -ltn 2>/dev/null | grep -qE ':(5000|3000)\b'; then
	echo "Port 5000 or 3000 is already in use (a server left over from an earlier run?). Stop it first."
	exit 1
fi
docker compose up -d --wait db || exit 1

set -m # every background job gets its own process group, so it can be stopped together with its child processes
pids=()

stop_all() {
	trap - INT TERM EXIT
	echo
	echo "Stopping the server, Next and Postgres..."
	for pid in "${pids[@]}"; do kill -TERM -- "-$pid" 2>/dev/null; done
	wait 2>/dev/null
	docker compose stop db >/dev/null
	exit 0
}
trap stop_all INT TERM EXIT

# env is used because the EF Core log key has dots in it, which a shell variable name cannot have. Warning hides the per-tick SELECT lines.
env "ConnectionStrings__Postgres=$DB_URL" "Logging__LogLevel__Microsoft.EntityFrameworkCore.Database.Command=Warning" \
	dotnet run --project server/Server &
pids+=($!)
NEXT_PUBLIC_API_URL="$API_URL" npx next dev &
pids+=($!)

wait -n # if either one stops by itself, stop the other too
