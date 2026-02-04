#!/usr/bin/env node
/**
 * Generate a PBKDF2-SHA256 password hash for ADMIN_PASS_HASH.
 *
 * Usage:
 *   node scripts/hash-password.mjs <password>
 *   node scripts/hash-password.mjs            # interactive prompt
 *
 * Output:
 *   pbkdf2:100000:<salt_hex>:<hash_hex>
 *
 * Copy the output and set it as ADMIN_PASS_HASH in your environment:
 *   - wrangler secret put ADMIN_PASS_HASH
 *   - or add to .env.local
 */

import { webcrypto } from 'node:crypto';

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function hashPassword(password) {
    const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await webcrypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
    );
    const derived = await webcrypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
        key,
        KEY_LENGTH * 8,
    );
    return `pbkdf2:${ITERATIONS}:${bufToHex(salt)}:${bufToHex(derived)}`;
}

async function main() {
    let password = process.argv[2];

    if (!password) {
        // Interactive prompt
        const readline = await import('node:readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
        password = await new Promise(resolve => {
            rl.question('Enter password: ', answer => {
                rl.close();
                resolve(answer);
            });
        });
    }

    if (!password) {
        console.error('Error: password is required');
        process.exit(1);
    }

    const hash = await hashPassword(password);
    console.log(hash);
}

main();
