import type { Config } from 'drizzle-kit';

export default {
    out: './drizzle',
    schema: './src/db/schema.ts',
    dialect: 'sqlite',
    driver: 'd1-http',
} satisfies Config;
