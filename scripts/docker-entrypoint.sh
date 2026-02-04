#!/usr/bin/env sh
set -e

if [ -n "$SQLITE_PATH" ]; then
  if [ ! -s "$SQLITE_PATH" ]; then
    echo "Initializing SQLite database at $SQLITE_PATH"
    mkdir -p "$(dirname "$SQLITE_PATH")"
    sqlite3 "$SQLITE_PATH" < /app/sql/init_d1.sql
  fi
fi

exec "$@"
