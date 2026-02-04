/**
 * Type definitions for Cloudflare environment bindings.
 * These must match the bindings defined in wrangler.toml.
 */

interface CloudflareEnv {
    DB: D1Database;
    FARALLON: KVNamespace;
    NEXT_PUBLIC_BASE_URL?: string;
}
