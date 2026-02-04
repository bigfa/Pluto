import { createSupabaseClient } from './client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

/**
 * Supabase Auth 工具类
 * 用于用户认证和授权
 */

export interface SignUpCredentials {
    email: string;
    password: string;
    options?: {
        data?: Record<string, unknown>;
        emailRedirectTo?: string;
    };
}

export interface SignInCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: User | null;
    session: Session | null;
    error: AuthError | null;
}

/**
 * 邮箱密码注册
 */
export async function signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: credentials.options,
    });

    return {
        user: data.user,
        session: data.session,
        error,
    };
}

/**
 * 邮箱密码登录
 */
export async function signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
    });

    return {
        user: data.user,
        session: data.session,
        error,
    };
}

/**
 * 魔法链接登录（无密码）
 */
export async function signInWithMagicLink(
    email: string,
    redirectTo?: string
): Promise<{ error: AuthError | null }> {
    const supabase = createSupabaseClient();

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectTo,
        },
    });

    return { error };
}

/**
 * 社交登录（OAuth）
 */
export async function signInWithOAuth(
    provider: 'google' | 'github' | 'facebook' | 'twitter',
    redirectTo?: string
) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        },
    });

    return { data, error };
}

/**
 * 登出
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
    const supabase = createSupabaseClient();

    const { error } = await supabase.auth.signOut();

    return { error };
}

/**
 * 获取当前用户
 */
export async function getCurrentUser(): Promise<User | null> {
    const supabase = createSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();

    return user;
}

/**
 * 获取当前会话
 */
export async function getSession(): Promise<Session | null> {
    const supabase = createSupabaseClient();

    const { data: { session } } = await supabase.auth.getSession();

    return session;
}

/**
 * 更新用户信息
 */
export async function updateUser(attributes: {
    email?: string;
    password?: string;
    data?: Record<string, unknown>;
}): Promise<{ user: User | null; error: AuthError | null }> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.auth.updateUser(attributes);

    return { user: data.user, error };
}

/**
 * 重置密码
 */
export async function resetPassword(
    email: string,
    redirectTo?: string
): Promise<{ error: AuthError | null }> {
    const supabase = createSupabaseClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
    });

    return { error };
}

/**
 * 监听认证状态变化
 */
export function onAuthStateChange(
    callback: (event: string, session: Session | null) => void
) {
    const supabase = createSupabaseClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);

    return subscription;
}
