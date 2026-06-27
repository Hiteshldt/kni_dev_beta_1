#!/usr/bin/env bash
# Start the bundled, self-contained dev Postgres cluster (port 5433, trust auth).
# Lives in repo-root/.devdb (gitignored). Does not touch your system Postgres.
set -euo pipefail

PGBIN=${PGBIN:-/opt/homebrew/opt/postgresql@18/bin}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DATA="$ROOT/.devdb/data"

if [ ! -d "$DATA" ]; then
  echo "Initializing dev cluster at $DATA ..."
  mkdir -p "$ROOT/.devdb"
  "$PGBIN/initdb" -D "$DATA" -U kanni --auth=trust -E UTF8 >/dev/null
  grep -q "^port = 5433" "$DATA/postgresql.conf" || echo "port = 5433" >> "$DATA/postgresql.conf"
fi

if "$PGBIN/pg_isready" -p 5433 -h /tmp >/dev/null 2>&1; then
  echo "Dev Postgres already running on :5433"
else
  "$PGBIN/pg_ctl" -D "$DATA" -l "$ROOT/.devdb/server.log" -o "-p 5433 -k /tmp" start
  sleep 1
fi

# Ensure the app database exists.
if ! "$PGBIN/psql" -p 5433 -h /tmp -U kanni -lqt | cut -d'|' -f1 | grep -qw kanni_dev; then
  "$PGBIN/createdb" -p 5433 -h /tmp -U kanni kanni_dev
  echo "Created database kanni_dev"
fi
echo "Dev Postgres ready: postgresql://kanni@localhost/kanni_dev?host=/tmp&port=5433"
