#!/usr/bin/env node
/**
 * Sync local .env(.local) values to Cloudflare Workers via Wrangler.
 *
 * Usage:
 *   node scripts/sync-wrangler-env.mjs
 *   node scripts/sync-wrangler-env.mjs --file .env.local
 *   node scripts/sync-wrangler-env.mjs --env production
 *   node scripts/sync-wrangler-env.mjs --dry-run
 *
 * Secrets are put via `wrangler secret put`:
 *   - ADMIN_USER
 *   - ADMIN_PASS_HASH
 *   - SESSION_SECRET
 *   - RESEND_API_KEY
 *
 * Override secret keys:
 *   WRANGLER_SECRET_KEYS=KEY1,KEY2 node scripts/sync-wrangler-env.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const argValue = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
};

const hasFlag = (name) => args.includes(name);

const envFile = argValue('--file') || '.env.local';
const envName = argValue('--env');
const dryRun = hasFlag('--dry-run');

const secretKeys =
    (process.env.WRANGLER_SECRET_KEYS || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
        .concat([
            'ADMIN_USER',
            'ADMIN_PASS_HASH',
            'SESSION_SECRET',
            'RESEND_API_KEY',
        ])
        .filter(Boolean);

const secretSet = new Set(secretKeys);

const filePath = path.resolve(process.cwd(), envFile);
if (!fs.existsSync(filePath)) {
    console.error(`Env file not found: ${filePath}`);
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split(/\r?\n/);

const parsed = {};
for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    parsed[key] = value;
}

const runWrangler = (argsList, input) => {
    if (dryRun) {
        console.log(`[dry-run] npx ${argsList.join(' ')}`);
        return { status: 0 };
    }
    return spawnSync('npx', argsList, {
        stdio: ['pipe', 'inherit', 'inherit'],
        input,
    });
};

for (const [key, value] of Object.entries(parsed)) {
    if (!value) continue;
    const isSecret = secretSet.has(key);
    const baseArgs = ['wrangler', isSecret ? 'secret' : 'vars', isSecret ? 'put' : 'set', key];
    if (!isSecret) {
        baseArgs.push(value);
    }
    if (envName) {
        baseArgs.push('--env', envName);
    }

    console.log(`Sync ${isSecret ? 'secret' : 'var'}: ${key}`);
    const result = runWrangler(baseArgs, isSecret ? `${value}\n` : undefined);
    if (result.status !== 0) {
        console.error(`Failed to sync ${key}`);
        process.exit(result.status || 1);
    }
}

console.log('Sync complete.');
