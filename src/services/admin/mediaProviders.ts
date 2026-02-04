/**
 * Media Providers - Storage abstraction for R2, UpYun, and Tencent COS
 *
 * Ported from hugo-cf-work admin media providers.
 */

import { Md5 } from 'ts-md5';
import type { Env } from '@/lib/env';
import type { MediaProvider } from '@/types/admin';

// ---- Helpers ----

async function hmacSha1(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        typeof key === 'string' ? enc.encode(key) : key,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign'],
    );
    return crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// ---- Local (Filesystem) ----

const DEFAULT_LOCAL_DIR = 'public/uploads';
const DEFAULT_LOCAL_PUBLIC_URL = '/uploads';

async function resolveLocalTarget(env: Env, key: string) {
    const { resolve, dirname, sep } = await import('node:path');
    const baseDir = env.MEDIA_LOCAL_DIR || DEFAULT_LOCAL_DIR;
    const basePath = resolve(process.cwd(), baseDir);
    const targetPath = resolve(basePath, key);

    if (targetPath !== basePath && !targetPath.startsWith(`${basePath}${sep}`)) {
        throw new Error('Invalid media key');
    }

    return { basePath, targetPath, dirname };
}

async function putLocal(
    env: Env,
    key: string,
    data: ArrayBuffer | ReadableStream,
): Promise<void> {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { targetPath, dirname } = await resolveLocalTarget(env, key);

    await mkdir(dirname(targetPath), { recursive: true });

    const buffer =
        data instanceof ArrayBuffer
            ? Buffer.from(data)
            : Buffer.from(await new Response(data).arrayBuffer());

    await writeFile(targetPath, buffer);
}

async function deleteLocal(env: Env, key: string): Promise<void> {
    const { unlink } = await import('node:fs/promises');
    const { targetPath } = await resolveLocalTarget(env, key);

    try {
        await unlink(targetPath);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw err;
        }
    }
}

function publicUrlLocal(env: Env, key: string, requestOrigin?: string): string {
    const sanitizedKey = key.replace(/^\/+/, '');
    const baseFromEnv =
        env.MEDIA_LOCAL_PUBLIC_URL ||
        env.MEDIA_DOMAIN ||
        env.NEXT_PUBLIC_BASE_URL;

    if (baseFromEnv) {
        const base = baseFromEnv.trim();
        if (base.startsWith('/')) {
            const origin = requestOrigin ? requestOrigin.replace(/\/$/, '') : '';
            const pathBase = base.replace(/\/$/, '');
            const prefix = origin ? `${origin}${pathBase}` : pathBase;
            return `${prefix.replace(/\/$/, '')}/${sanitizedKey}`;
        }
        return `${base.replace(/\/$/, '')}/${sanitizedKey}`;
    }

    const fallbackBase = requestOrigin
        ? `${requestOrigin.replace(/\/$/, '')}${DEFAULT_LOCAL_PUBLIC_URL}`
        : DEFAULT_LOCAL_PUBLIC_URL;
    return `${fallbackBase.replace(/\/$/, '')}/${sanitizedKey}`;
}

// ---- R2 ----

async function putR2(env: Env, key: string, data: ArrayBuffer | ReadableStream, contentType: string): Promise<void> {
    if (!env.MEDIA_BUCKET) {
        throw new Error('MEDIA_BUCKET (R2) binding is not available');
    }
    await env.MEDIA_BUCKET.put(key, data, {
        httpMetadata: { contentType },
    });
}

async function deleteR2(env: Env, key: string): Promise<void> {
    if (!env.MEDIA_BUCKET) {
        throw new Error('MEDIA_BUCKET (R2) binding is not available');
    }
    await env.MEDIA_BUCKET.delete(key);
}

function publicUrlR2(env: Env, key: string): string {
    const domain = env.R2_DOMAIN || env.MEDIA_DOMAIN || '';
    return `${domain.replace(/\/$/, '')}/${key}`;
}

// ---- UpYun ----

function upyunSign(operator: string, passwordMd5: string, method: string, uri: string, date: string): string {
    const signStr = `${method}&${uri}&${date}`;
    // UpYun uses HMAC-SHA1 with the MD5 of the password
    // We need to compute synchronously for the header, but crypto.subtle is async,
    // so the caller must use the async version below.
    void operator;
    void passwordMd5;
    void signStr;
    return ''; // placeholder - real impl is async
}

async function upyunSignAsync(
    operator: string,
    password: string,
    method: string,
    uri: string,
    date: string,
): Promise<string> {
    const passwordMd5 = Md5.hashStr(password);
    const signStr = `${method}&${uri}&${date}`;
    const hmac = await hmacSha1(passwordMd5, signStr);
    const signature = arrayBufferToBase64(hmac);
    return `UPYUN ${operator}:${signature}`;
}

async function putUpYun(
    env: Env,
    key: string,
    data: ArrayBuffer | ReadableStream,
    contentType: string,
): Promise<void> {
    const bucket = env.UPYUN_BUCKET;
    const operator = env.UPYUN_OPERATOR;
    const password = env.UPYUN_PASSWORD;
    if (!bucket || !operator || !password) {
        throw new Error('UpYun credentials not configured');
    }

    const uri = `/${bucket}/${key}`;
    const date = new Date().toUTCString();
    const authorization = await upyunSignAsync(operator, password, 'PUT', uri, date);

    const body = data instanceof ArrayBuffer ? data : await new Response(data).arrayBuffer();

    const resp = await fetch(`https://v0.api.upyun.com${uri}`, {
        method: 'PUT',
        headers: {
            Authorization: authorization,
            Date: date,
            'Content-Type': contentType,
        },
        body,
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`UpYun PUT failed (${resp.status}): ${text}`);
    }
}

async function deleteUpYun(env: Env, key: string): Promise<void> {
    const bucket = env.UPYUN_BUCKET;
    const operator = env.UPYUN_OPERATOR;
    const password = env.UPYUN_PASSWORD;
    if (!bucket || !operator || !password) {
        throw new Error('UpYun credentials not configured');
    }

    const uri = `/${bucket}/${key}`;
    const date = new Date().toUTCString();
    const authorization = await upyunSignAsync(operator, password, 'DELETE', uri, date);

    const resp = await fetch(`https://v0.api.upyun.com${uri}`, {
        method: 'DELETE',
        headers: {
            Authorization: authorization,
            Date: date,
        },
    });

    if (!resp.ok && resp.status !== 404) {
        const text = await resp.text();
        throw new Error(`UpYun DELETE failed (${resp.status}): ${text}`);
    }
}

function publicUrlUpYun(env: Env, key: string): string {
    const domain = env.UPYUN_DOMAIN || env.MEDIA_DOMAIN || '';
    return `${domain.replace(/\/$/, '')}/${key}`;
}

// ---- Tencent COS ----

async function sha1Hex(data: string): Promise<string> {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-1', enc.encode(data));
    return arrayBufferToHex(hashBuffer);
}

async function cosAuthorization(
    secretId: string,
    secretKey: string,
    method: string,
    path: string,
    headers: Record<string, string>,
    expireSeconds: number = 600,
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const keyTime = `${now};${now + expireSeconds}`;

    // SignKey = HMAC-SHA1(SecretKey, KeyTime)
    const signKey = await hmacSha1(secretKey, keyTime);
    const signKeyHex = arrayBufferToHex(signKey);

    // Build lowercase header map for consistent lookup
    const lowerHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
        lowerHeaders[k.toLowerCase()] = v;
    }

    const sortedHeaderKeys = Object.keys(lowerHeaders).sort();
    const headerList = sortedHeaderKeys.join(';');
    const httpHeaders = sortedHeaderKeys
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(lowerHeaders[k])}`)
        .join('&');

    // No query params for PUT/DELETE
    const httpString = `${method.toLowerCase()}\n${path}\n\n${httpHeaders}\n`;
    const httpStringHash = await sha1Hex(httpString);

    const stringToSign = `sha1\n${keyTime}\n${httpStringHash}\n`;

    // Signature = HMAC-SHA1(SignKey_hex, StringToSign)
    const enc = new TextEncoder();
    const signKeyForFinal = await crypto.subtle.importKey(
        'raw',
        enc.encode(signKeyHex),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign'],
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', signKeyForFinal, enc.encode(stringToSign));
    const signature = arrayBufferToHex(signatureBuffer);

    return [
        `q-sign-algorithm=sha1`,
        `q-ak=${secretId}`,
        `q-sign-time=${keyTime}`,
        `q-key-time=${keyTime}`,
        `q-header-list=${headerList}`,
        `q-url-param-list=`,
        `q-signature=${signature}`,
    ].join('&');
}

async function putCOS(
    env: Env,
    key: string,
    data: ArrayBuffer | ReadableStream,
    contentType: string,
): Promise<void> {
    const secretId = env.COS_SECRET_ID;
    const secretKey = env.COS_SECRET_KEY;
    const bucket = env.COS_BUCKET;
    const region = env.COS_REGION;
    if (!secretId || !secretKey || !bucket || !region) {
        throw new Error('COS credentials not configured');
    }

    const path = `/${key}`;
    const host = `${bucket}.cos.${region}.myqcloud.com`;
    const ct = contentType || 'application/octet-stream';

    const headersToSign: Record<string, string> = {
        host,
        'content-type': ct,
    };

    const authorization = await cosAuthorization(secretId, secretKey, 'PUT', path, headersToSign);

    const body = data instanceof ArrayBuffer ? data : await new Response(data).arrayBuffer();

    const resp = await fetch(`https://${host}${path}`, {
        method: 'PUT',
        headers: {
            Authorization: authorization,
            Host: host,
            'Content-Type': ct,
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body,
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`COS PUT failed (${resp.status}): ${text}`);
    }
}

async function deleteCOS(env: Env, key: string): Promise<void> {
    const secretId = env.COS_SECRET_ID;
    const secretKey = env.COS_SECRET_KEY;
    const bucket = env.COS_BUCKET;
    const region = env.COS_REGION;
    if (!secretId || !secretKey || !bucket || !region) {
        throw new Error('COS credentials not configured');
    }

    const host = `${bucket}.cos.${region}.myqcloud.com`;
    const path = `/${key}`;
    const headers: Record<string, string> = {
        Host: host,
    };

    const authorization = await cosAuthorization(secretId, secretKey, 'DELETE', path, headers);

    const resp = await fetch(`https://${host}${path}`, {
        method: 'DELETE',
        headers: {
            ...headers,
            Authorization: authorization,
        },
    });

    if (!resp.ok && resp.status !== 404) {
        const text = await resp.text();
        throw new Error(`COS DELETE failed (${resp.status}): ${text}`);
    }
}

function publicUrlCOS(env: Env, key: string): string {
    if (env.COS_DOMAIN) {
        return `${env.COS_DOMAIN.replace(/\/$/, '')}/${key}`;
    }
    const bucket = env.COS_BUCKET || '';
    const region = env.COS_REGION || '';
    return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
}

// ---- Public API ----

/**
 * Upload an object to the specified storage provider.
 */
export async function putObject(
    env: Env,
    provider: MediaProvider,
    key: string,
    data: ArrayBuffer | ReadableStream,
    contentType: string,
): Promise<void> {
    switch (provider) {
        case 'local':
            return putLocal(env, key, data);
        case 'r2':
            return putR2(env, key, data, contentType);
        case 'upyun':
            return putUpYun(env, key, data, contentType);
        case 'cos':
            return putCOS(env, key, data, contentType);
        default:
            throw new Error(`Unsupported media provider: ${provider}`);
    }
}

/**
 * Delete an object from the specified storage provider.
 */
export async function deleteObject(
    env: Env,
    provider: MediaProvider,
    key: string,
): Promise<void> {
    switch (provider) {
        case 'local':
            return deleteLocal(env, key);
        case 'r2':
            return deleteR2(env, key);
        case 'upyun':
            return deleteUpYun(env, key);
        case 'cos':
            return deleteCOS(env, key);
        default:
            throw new Error(`Unsupported media provider: ${provider}`);
    }
}

/**
 * Generate a public URL for the given object key.
 */
export function publicUrlForKey(
    env: Env,
    provider: MediaProvider,
    key: string,
    requestOrigin?: string,
): string {
    if (provider === 'local') {
        return publicUrlLocal(env, key, requestOrigin);
    }

    // If MEDIA_DOMAIN is set, use it regardless of provider (non-local)
    if (env.MEDIA_DOMAIN) {
        return `${env.MEDIA_DOMAIN.replace(/\/$/, '')}/${key}`;
    }

    switch (provider) {
        case 'r2':
            return publicUrlR2(env, key);
        case 'upyun':
            return publicUrlUpYun(env, key);
        case 'cos':
            return publicUrlCOS(env, key);
        default: {
            // Fallback: use requestOrigin if available
            const base = requestOrigin || '';
            return `${base.replace(/\/$/, '')}/${key}`;
        }
    }
}

// Suppress unused helper warning
void upyunSign;
