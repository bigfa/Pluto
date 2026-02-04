import type { Config } from 'drizzle-kit';

/**
 * Drizzle 配置文件 - Supabase PostgreSQL
 *
 * 使用方法：
 * npx drizzle-kit generate --config=drizzle.config.supabase.ts
 * npx drizzle-kit push --config=drizzle.config.supabase.ts
 * npx drizzle-kit studio --config=drizzle.config.supabase.ts
 */

export default {
    out: './drizzle/supabase',
    schema: './src/db/schema_pg.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.SUPABASE_DB_URL || '',
    },
    verbose: true,
    strict: true,
} satisfies Config;
