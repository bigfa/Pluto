/**
 * Environment Helpers
 *
 * Provides access to environment bindings (D1, KV, Supabase, etc.) in Next.js pages.
 * On Cloudflare: uses @opennextjs/cloudflare's getCloudflareContext.
 * On other platforms (EdgeOne, etc.): reads from process.env.
 */

export interface Env {
    DB?: D1Database;
    FARALLON?: KVNamespace;
    SUPABASE_DB_URL?: string;
    SQLITE_PATH?: string;
    NEXT_PUBLIC_API_BASE_URL?: string;
    NEXT_PUBLIC_BASE_URL?: string;

    // Admin auth
    ADMIN_USER?: string;
    ADMIN_PASS_HASH?: string;  // PBKDF2 hash (preferred) — run: node scripts/hash-password.mjs
    ADMIN_PASS?: string;       // Plaintext fallback (legacy, not recommended)
    SESSION_SECRET?: string;

    // Storage: R2 (Cloudflare-only binding)
    MEDIA_BUCKET?: R2Bucket;
    MEDIA_DOMAIN?: string;
    MEDIA_DEFAULT_PROVIDER?: string;
    MEDIA_THUMB_STYLE?: string;
    MEDIA_MEDIUM_STYLE?: string;
    MEDIA_LARGE_STYLE?: string;
    R2_DOMAIN?: string;
    MEDIA_LOCAL_DIR?: string;
    MEDIA_LOCAL_PUBLIC_URL?: string;

    // UpYun
    UPYUN_BUCKET?: string;
    UPYUN_OPERATOR?: string;
    UPYUN_PASSWORD?: string;
    UPYUN_DOMAIN?: string;

    // Tencent COS
    COS_SECRET_ID?: string;
    COS_SECRET_KEY?: string;
    COS_BUCKET?: string;
    COS_REGION?: string;
    COS_DOMAIN?: string;

    // Email (Resend)
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    EMAIL_FROM?: string;

    // Geocoding (optional)
    GEOCODE_PROVIDER?: string;
    GEOCODE_API_KEY?: string;
    GEOCODE_USER_AGENT?: string;
    GEOCODE_LANGUAGE?: string;
}

/**
 * Get environment bindings.
 * Call this in server components or API routes to access D1, KV, Supabase, etc.
 */
export async function getEnv(): Promise<Env> {
    try {
        const cfModule = '@opennextjs/cloudflare';
        const { getCloudflareContext } = await import(/* webpackIgnore: true */ cfModule);
        const { env } = await getCloudflareContext({ async: true });
        return env as Env;
    } catch (e) {
        // Log error for debugging why Cloudflare context failed
        console.warn('Failed to get Cloudflare context, falling back to process.env:', e);

        // Non-Cloudflare environment (EdgeOne Pages, local dev, etc.)
        return {
            // Attempt to get DB from process.env (e.g. for local mocks)
            DB: (process.env as unknown as { DB?: D1Database }).DB,
            SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
            SQLITE_PATH: process.env.SQLITE_PATH,
            NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
            NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
            // Admin auth
            ADMIN_USER: process.env.ADMIN_USER,
            ADMIN_PASS_HASH: process.env.ADMIN_PASS_HASH,
            ADMIN_PASS: process.env.ADMIN_PASS,
            SESSION_SECRET: process.env.SESSION_SECRET,
            // Storage
            MEDIA_DOMAIN: process.env.MEDIA_DOMAIN,
            MEDIA_DEFAULT_PROVIDER: process.env.MEDIA_DEFAULT_PROVIDER,
            MEDIA_THUMB_STYLE: process.env.MEDIA_THUMB_STYLE,
            MEDIA_MEDIUM_STYLE: process.env.MEDIA_MEDIUM_STYLE,
            MEDIA_LARGE_STYLE: process.env.MEDIA_LARGE_STYLE,
            R2_DOMAIN: process.env.R2_DOMAIN,
            MEDIA_LOCAL_DIR: process.env.MEDIA_LOCAL_DIR,
            MEDIA_LOCAL_PUBLIC_URL: process.env.MEDIA_LOCAL_PUBLIC_URL,
            // UpYun
            UPYUN_BUCKET: process.env.UPYUN_BUCKET,
            UPYUN_OPERATOR: process.env.UPYUN_OPERATOR,
            UPYUN_PASSWORD: process.env.UPYUN_PASSWORD,
            UPYUN_DOMAIN: process.env.UPYUN_DOMAIN,
            // COS
            COS_SECRET_ID: process.env.COS_SECRET_ID,
            COS_SECRET_KEY: process.env.COS_SECRET_KEY,
            COS_BUCKET: process.env.COS_BUCKET,
            COS_REGION: process.env.COS_REGION,
            COS_DOMAIN: process.env.COS_DOMAIN,
            // Email
            RESEND_API_KEY: process.env.RESEND_API_KEY,
            RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
            EMAIL_FROM: process.env.EMAIL_FROM,
            // Geocoding
            GEOCODE_PROVIDER: process.env.GEOCODE_PROVIDER,
            GEOCODE_API_KEY: process.env.GEOCODE_API_KEY,
            GEOCODE_USER_AGENT: process.env.GEOCODE_USER_AGENT,
            GEOCODE_LANGUAGE: process.env.GEOCODE_LANGUAGE,
        };
    }
}

/**
 * Check if a database is available.
 */
export async function hasDatabase(): Promise<boolean> {
    const env = await getEnv();
    return !!env.DB || !!env.SUPABASE_DB_URL;
}
