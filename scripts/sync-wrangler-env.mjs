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
 * Non-secret values are written to `wrangler.toml` under [vars] (or [env.<name>.vars]).
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

const explicitSecretKeys = [
    'ADMIN_USER',
    'ADMIN_PASS_HASH',
    'ADMIN_PASS',
    'SESSION_SECRET',
    'RESEND_API_KEY',
    'SUPABASE_DB_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'UPYUN_PASSWORD',
    'COS_SECRET_ID',
    'COS_SECRET_KEY',
    'GEOCODE_API_KEY',
];

const secretKeys =
    (process.env.WRANGLER_SECRET_KEYS || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
        .concat(explicitSecretKeys)
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

const wranglerLogPath = process.env.WRANGLER_LOG_PATH || path.resolve(process.cwd(), '.wrangler', 'logs');

const runWrangler = (argsList, input) => {
    if (dryRun) {
        console.log(`[dry-run] npx ${argsList.join(' ')}`);
        return { status: 0 };
    }
    return spawnSync('npx', argsList, {
        stdio: ['pipe', 'inherit', 'inherit'],
        input,
        env: {
            ...process.env,
            WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || wranglerLogPath,
        },
    });
};

const looksLikeSecretKey = (key) => {
    if (key.startsWith('NEXT_PUBLIC_')) return false;
    const upper = key.toUpperCase();
    if (upper.endsWith('_DB_URL') || upper.endsWith('_DATABASE_URL')) return true;
    if (upper.includes('SERVICE_ROLE')) return true;
    if (upper.includes('SECRET') || upper.includes('PASSWORD') || upper.includes('TOKEN') || upper.includes('PASS')) return true;
    if (upper.endsWith('_KEY')) return true;
    return false;
};

const entries = Object.entries(parsed).filter(([, value]) => value !== '');
const secretEntries = entries.filter(([key]) => secretSet.has(key) || looksLikeSecretKey(key));
const varEntries = entries.filter(([key]) => !(secretSet.has(key) || looksLikeSecretKey(key)));

const tomlPath = path.resolve(process.cwd(), 'wrangler.toml');

const findSectionRange = (lines, header) => {
    const start = lines.findIndex((line) => line.trim() === header);
    if (start === -1) return null;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            end = i;
            break;
        }
    }
    return { start, end };
};

const ensureSection = (lines, header) => {
    let range = findSectionRange(lines, header);
    if (!range) {
        if (lines.length && lines[lines.length - 1].trim() !== '') {
            lines.push('');
        }
        lines.push(header);
        range = { start: lines.length - 1, end: lines.length };
    }
    return range;
};

const upsertVars = (content, targetHeader, entriesToSet) => {
    const lines = content.split(/\r?\n/);
    const range = ensureSection(lines, targetHeader);
    const sectionLines = lines.slice(range.start + 1, range.end);
    const keyToIndex = new Map();
    for (let i = 0; i < sectionLines.length; i += 1) {
        const match = sectionLines[i].match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (match) {
            keyToIndex.set(match[1], i);
        }
    }

    for (const [key, value] of entriesToSet) {
        const line = `${key} = ${JSON.stringify(value)}`;
        if (keyToIndex.has(key)) {
            sectionLines[keyToIndex.get(key)] = line;
        } else {
            sectionLines.push(line);
        }
    }

    const updatedLines = [
        ...lines.slice(0, range.start + 1),
        ...sectionLines,
        ...lines.slice(range.end),
    ];
    return updatedLines.join('\n');
};

if (varEntries.length > 0) {
    if (!fs.existsSync(tomlPath)) {
        console.error(`wrangler.toml not found: ${tomlPath}`);
        process.exit(1);
    }
    const targetHeader = envName ? `[env.${envName}.vars]` : '[vars]';
    console.log(`Sync vars to ${targetHeader} in wrangler.toml`);
    const tomlContent = fs.readFileSync(tomlPath, 'utf-8');
    const updatedToml = upsertVars(tomlContent, targetHeader, varEntries);
    if (dryRun) {
        for (const [key] of varEntries) {
            console.log(`[dry-run] set var ${key}`);
        }
    } else if (updatedToml !== tomlContent) {
        fs.writeFileSync(tomlPath, updatedToml);
    }
}

for (const [key, value] of secretEntries) {
    const baseArgs = ['wrangler', 'secret', 'put', key];
    if (envName) {
        baseArgs.push('--env', envName);
    }
    console.log(`Sync secret: ${key}`);
    const result = runWrangler(baseArgs, `${value}\n`);
    if (result.status !== 0) {
        console.error(`Failed to sync ${key}`);
        process.exit(result.status || 1);
    }
}

console.log('Sync complete.');
