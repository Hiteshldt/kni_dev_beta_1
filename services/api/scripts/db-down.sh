#!/usr/bin/env bash
# Stop the bundled dev Postgres cluster.
set -euo pipefail
PGBIN=${PGBIN:-/opt/homebrew/opt/postgresql@18/bin}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DATA="$ROOT/.devdb/data"
"$PGBIN/pg_ctl" -D "$DATA" stop || true
