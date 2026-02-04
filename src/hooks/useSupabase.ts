'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

/**
 * 获取当前认证用户的 Hook
 */
export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = getSupabase();

        // 获取初始用户
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            setLoading(false);
        });

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { user, loading };
}

/**
 * 获取当前会话的 Hook
 */
export function useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = getSupabase();

        // 获取初始会话
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { session, loading };
}

/**
 * 实时订阅 Hook
 */
export function useRealtimeSubscription<T = unknown>(
    table: string,
    filter?: string,
    callback?: (payload: T) => void
) {
    const [data, setData] = useState<T | null>(null);

    useEffect(() => {
        const supabase = getSupabase();

        const channel = supabase
            .channel(`table-${table}-changes`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table,
                    filter,
                },
                (payload) => {
                    const newData = payload.new as T;
                    setData(newData);
                    callback?.(newData);
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [table, filter, callback]);

    return data;
}

/**
 * 媒体点赞实时更新 Hook
 */
export function useMediaLikes(mediaId: string) {
    const [likes, setLikes] = useState<number>(0);

    useEffect(() => {
        if (!mediaId) return;

        const supabase = getSupabase();

        const channel = supabase
            .channel(`media-${mediaId}-likes`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'media',
                    filter: `id=eq.${mediaId}`,
                },
                (payload) => {
                    if (payload.new && typeof payload.new === 'object' && 'likes' in payload.new) {
                        setLikes((payload.new as { likes: number }).likes);
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [mediaId]);

    return likes;
}

/**
 * 相册评论实时更新 Hook
 */
export function useAlbumComments(albumId: string) {
    const [comments, setComments] = useState<unknown[]>([]);

    useEffect(() => {
        if (!albumId) return;

        const supabase = getSupabase();

        const channel = supabase
            .channel(`album-${albumId}-comments`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'comments',
                    filter: `comment_post_ID=eq.${albumId}`,
                },
                (payload) => {
                    setComments((prev) => [...prev, payload.new]);
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [albumId]);

    return comments;
}
