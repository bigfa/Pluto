#!/usr/bin/env node
/**
 * Migrate media.url to store object_key instead of full domain.
 *
 * Usage:
 *   node scripts/migrate-media-urls.mjs --sqlite /path/to/db
 *   node scripts/migrate-media-urls.mjs --pg <DATABASE_URL>
 *   node scripts/migrate-media-urls.mjs --dry-run
 *
 * Notes:
 * - Only updates rows where url starts with http(s) and object_key is present.
 * - The new url will be set to object_key.
 */

import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const argValue = (name) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const hasFlag = (name) => args.includes(name);

const dryRun = hasFlag('--dry-run');
const sqlitePath = argValue('--sqlite') || process.env.SQLITE_PATH || process.env.DATABASE_URL;
const pgUrl = argValue('--pg') || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

const shouldUseSqlite = Boolean(sqlitePath) && !argValue('--pg');

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value || '');

async function migrateSqlite(dbPath) {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);

  const rows = db.prepare('SELECT id, url, object_key FROM media').all();
  let changed = 0;

  const stmt = db.prepare('UPDATE media SET url = ? WHERE id = ?');

  for (const row of rows) {
    if (!row.object_key) continue;
    if (!row.url) continue;
    if (!isAbsoluteUrl(row.url)) continue;

    if (dryRun) {
      console.log(`[dry-run] ${row.id}: ${row.url} -> ${row.object_key}`);
      changed += 1;
      continue;
    }

    stmt.run(row.object_key, row.id);
    changed += 1;
  }

  db.close();
  console.log(`SQLite updated: ${changed} rows`);
}

async function migratePostgres(databaseUrl) {
  const postgres = require('postgres');
  const sql = postgres(databaseUrl, { max: 1 });

  const rows = await sql`SELECT id, url, object_key FROM media`;
  let changed = 0;

  for (const row of rows) {
    if (!row.object_key) continue;
    if (!row.url) continue;
    if (!isAbsoluteUrl(row.url)) continue;

    if (dryRun) {
      console.log(`[dry-run] ${row.id}: ${row.url} -> ${row.object_key}`);
      changed += 1;
      continue;
    }

    await sql`UPDATE media SET url = ${row.object_key} WHERE id = ${row.id}`;
    changed += 1;
  }

  await sql.end();
  console.log(`Postgres updated: ${changed} rows`);
}

async function main() {
  if (shouldUseSqlite) {
    const path = resolve(sqlitePath);
    return migrateSqlite(path);
  }

  if (pgUrl) {
    return migratePostgres(pgUrl);
  }

  console.error('No database target provided. Use --sqlite <path> or --pg <url>.');
  process.exit(1);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
