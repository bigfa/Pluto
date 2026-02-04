import { createClient } from '@supabase/supabase-js';

/**
 * Supabase 客户端配置
 *
 * 此客户端用于：
 * - Supabase Auth（身份验证）
 * - Supabase Storage（文件存储）
 * - Supabase Realtime（实时订阅）
 * - Supabase Edge Functions
 *
 * 注意：数据库查询应该使用 Drizzle ORM（参见 src/db/client.ts）
 */

export interface SupabaseConfig {
    url: string;
    anonKey: string;
}

/**
 * 创建 Supabase 客户端实例
 * 用于浏览器端
 */
export function createSupabaseClient(config?: SupabaseConfig) {
    const supabaseUrl = config?.url || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = config?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
        );
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });
}

/**
 * 创建服务端 Supabase 客户端
 * 使用 Service Role Key（绕过 RLS）
 */
export function createSupabaseAdminClient(config?: { url: string; serviceRoleKey: string }) {
    const supabaseUrl = config?.url || process.env.SUPABASE_URL;
    const supabaseServiceKey = config?.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
            'Missing Supabase admin configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
        );
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

/**
 * 全局 Supabase 客户端实例（单例模式）
 * 仅在需要时使用（如浏览器端）
 */
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabase() {
    if (typeof window === 'undefined') {
        // 服务端不使用单例
        throw new Error('getSupabase() should only be called on the client side');
    }

    if (!supabaseInstance) {
        supabaseInstance = createSupabaseClient();
    }

    return supabaseInstance!;
}
