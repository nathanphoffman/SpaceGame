#!/usr/bin/env bash
# Starts one PostgreSQL per container (idempotent, safe to call from three workers at once), creates the database
# named by $1 if needed and prints its connection string. Sandbox only: needs the postgres binaries from ralph-dotnet.
set -euo pipefail
db="${1:?database name}"
bin="$(ls -d /usr/lib/postgresql/*/bin | tail -1)"
data="$HOME/pgdata"
port=5433
exec 9>"$HOME/pg.lock"
flock 9
[ -d "$data" ] || "$bin/initdb" -D "$data" -U ralph --auth=trust >/dev/null
if ! "$bin/pg_isready" -q -h 127.0.0.1 -p "$port"; then
  "$bin/pg_ctl" -D "$data" -l "$HOME/pg.log" -w start \
    -o "-p $port -c listen_addresses=127.0.0.1 -c fsync=off -c shared_buffers=64MB -c max_connections=60 -c dynamic_shared_memory_type=mmap" >/dev/null
fi
"$bin/psql" -h 127.0.0.1 -p "$port" -U ralph -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
  || "$bin/createdb" -h 127.0.0.1 -p "$port" -U ralph "$db"
echo "Host=127.0.0.1;Port=$port;Username=ralph;Database=$db"
