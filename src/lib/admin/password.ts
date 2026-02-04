/**
 * Password Hashing Utilities
 *
 * Uses PBKDF2-SHA256 via Web Crypto API — zero dependencies, works in
 * Cloudflare Workers, Node.js, and all modern runtimes.
 *
 * Hash format: "pbkdf2:100000:<salt_hex>:<hash_hex>"
 */

const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // bytes
const SALT_LENGTH = 16; // bytes
const ALGORITHM = 'PBKDF2';
const HASH_ALGO = 'SHA-256';

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuf(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer as ArrayBuffer;
}

/**
 * Hash a plaintext password. Returns a portable string:
 * "pbkdf2:100000:<salt_hex>:<hash_hex>"
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        ALGORITHM,
        false,
        ['deriveBits'],
    );
    const derived = await crypto.subtle.deriveBits(
        { name: ALGORITHM, salt, iterations: ITERATIONS, hash: HASH_ALGO },
        key,
        KEY_LENGTH * 8,
    );
    return `pbkdf2:${ITERATIONS}:${bufToHex(salt)}:${bufToHex(derived)}`;
}

/**
 * Verify a plaintext password against a stored hash string.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split(':');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

    const iterations = parseInt(parts[1], 10);
    const salt = hexToBuf(parts[2]);
    const expected = new Uint8Array(hexToBuf(parts[3]));

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        ALGORITHM,
        false,
        ['deriveBits'],
    );
    const derived = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: ALGORITHM, salt, iterations, hash: HASH_ALGO },
            key,
            expected.length * 8,
        ),
    );

    // Constant-time comparison
    if (derived.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < derived.length; i++) {
        diff |= derived[i] ^ expected[i];
    }
    return diff === 0;
}
