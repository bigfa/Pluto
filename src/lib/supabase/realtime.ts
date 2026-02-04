import { createSupabaseClient } from './client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Supabase Realtime 工具类
 * 用于实时数据订阅和广播
 */

export type DatabaseChange<T extends Record<string, unknown> = Record<string, unknown>> = RealtimePostgresChangesPayload<T>;

export interface SubscribeOptions<T extends Record<string, unknown> = Record<string, unknown>> {
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    schema?: string;
    table: string;
    filter?: string;
    callback: (payload: DatabaseChange<T>) => void;
}

/**
 * 订阅数据库表的变化
 */
export function subscribeToTable<T extends Record<string, unknown> = Record<string, unknown>>(
    options: SubscribeOptions<T>
): RealtimeChannel {
    const supabase = createSupabaseClient();

    const channel = supabase
        .channel(`table-${options.table}-changes`)
        .on(
            'postgres_changes',
            {
                event: options.event || '*',
                schema: options.schema || 'public',
                table: options.table,
                filter: options.filter,
            },
            (payload) => {
                options.callback(payload as DatabaseChange<T>);
            }
        )
        .subscribe();

    return channel;
}

/**
 * 订阅媒体点赞变化
 */
export function subscribeToMediaLikes(
    mediaId: string,
    callback: (likes: number) => void
): RealtimeChannel {
    return subscribeToTable({
        table: 'media',
        filter: `id=eq.${mediaId}`,
        event: 'UPDATE',
        callback: (payload) => {
            if (payload.new && typeof payload.new === 'object' && 'likes' in payload.new) {
                callback((payload.new as { likes: number }).likes);
            }
        },
    });
}

/**
 * 订阅相册评论变化
 */
export function subscribeToAlbumComments(
    albumId: string,
    callback: (comment: DatabaseChange) => void
): RealtimeChannel {
    return subscribeToTable({
        table: 'comments',
        filter: `comment_post_ID=eq.${albumId}`,
        event: 'INSERT',
        callback,
    });
}

/**
 * 订阅相册浏览量变化
 */
export function subscribeToAlbumViews(
    albumId: string,
    callback: (viewCount: number) => void
): RealtimeChannel {
    return subscribeToTable({
        table: 'albums',
        filter: `id=eq.${albumId}`,
        event: 'UPDATE',
        callback: (payload) => {
            if (payload.new && typeof payload.new === 'object' && 'view_count' in payload.new) {
                callback((payload.new as { view_count: number }).view_count);
            }
        },
    });
}

/**
 * 广播消息到频道
 */
export async function broadcastMessage(
    channelName: string,
    event: string,
    payload: Record<string, unknown>
): Promise<string> {
    const supabase = createSupabaseClient();

    const channel = supabase.channel(channelName);

    await channel.subscribe();

    const status = await channel.send({
        type: 'broadcast',
        event,
        payload,
    });

    return status;
}

/**
 * 监听广播消息
 */
export function subscribeToBroadcast(
    channelName: string,
    event: string,
    callback: (payload: Record<string, unknown>) => void
): RealtimeChannel {
    const supabase = createSupabaseClient();

    const channel = supabase
        .channel(channelName)
        .on('broadcast', { event }, (payload) => {
            callback(payload.payload as Record<string, unknown>);
        })
        .subscribe();

    return channel;
}

/**
 * 在线状态追踪
 */
export function trackPresence(
    channelName: string,
    userState: Record<string, unknown>
): RealtimeChannel {
    const supabase = createSupabaseClient();

    const channel = supabase.channel(channelName);

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            console.log('Online users:', state);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track(userState);
            }
        });

    return channel;
}

/**
 * 取消订阅频道
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<'ok' | 'timed out' | 'error'> {
    return await channel.unsubscribe();
}
