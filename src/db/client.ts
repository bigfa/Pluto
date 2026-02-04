import { drizzle } from 'drizzle-orm/d1';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as schemaPg from './schema_pg';

// Re-export Env from the canonical source
import type { Env } from '@/lib/env';
export type { Env };

export type D1DbType = ReturnType<typeof drizzle<typeof schema>>;
export type PgDbType = ReturnType<typeof drizzlePg<typeof schemaPg>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPgProxy(db: PgDbType): any {
    // Add .get() support for PostgreSQL queries to match D1 API
    return new Proxy(db, {
        get(target, prop) {
            const value = target[prop as keyof typeof target];
            if (typeof value === 'function') {
                return function (...args: unknown[]) {
                    const result = (value as (...a: unknown[]) => unknown).apply(target, args);
                    if (result && typeof result === 'object') {
                        return createQueryProxy(result);
                    }
                    return result;
                };
            }
            return value;
        }
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createQueryProxy(queryBuilder: any): any {
    return new Proxy(queryBuilder, {
        get(target, prop) {
            if (prop === 'get') {
                return async function () {
                    const results = await target;
                    return Array.isArray(results) ? results[0] || null : results;
                };
            }
            if (prop === 'all') {
                return async function () {
                    const results = await target;
                    return Array.isArray(results) ? results : [results];
                };
            }
            const value = target[prop];
            if (typeof value === 'function') {
                return function (...args: unknown[]) {
                    const result = value.apply(target, args);
                    if (result && typeof result === 'object') {
                        return createQueryProxy(result);
                    }
                    return result;
                };
            }
            return value;
        }
    });
}

export type DbClient = {
    type: 'd1';
    db: D1DbType;
    schema: typeof schema;
} | {
    type: 'pg';
    db: PgDbType;
    schema: typeof schemaPg;
};

export const getDbClient = (env: Env): DbClient | null => {
    // Priority 1: Supabase PostgreSQL
    if (env.SUPABASE_DB_URL) {
        const client = postgres(env.SUPABASE_DB_URL);
        const db = drizzlePg(client, { schema: schemaPg });
        return {
            type: 'pg',
            db: createPgProxy(db),
            schema: schemaPg,
        };
    }

    // Priority 2: Cloudflare D1
    if (env.DB) {
        return {
            type: 'd1',
            db: drizzle(env.DB, { schema }),
            schema,
        };
    }

    // No database available - use API fallback
    return null;
};

export const hasDatabase = (env: Env): boolean => {
    return !!(env.DB || env.SUPABASE_DB_URL);
};

/**
 * Get a unified database client for use in API routes.
 * Returns db and schema with relaxed types to avoid D1/PG union type issues.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDb = (env: Env): { db: any; schema: any } | null => {
    const client = getDbClient(env);
    if (!client) return null;
    return { db: client.db, schema: client.schema };
};
