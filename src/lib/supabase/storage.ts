import { createSupabaseClient, createSupabaseAdminClient } from './client';

/**
 * Supabase Storage 工具类
 * 用于管理媒体文件上传、下载和删除
 */

export const STORAGE_BUCKETS = {
    MEDIA: 'media',
    THUMBNAILS: 'thumbnails',
    AVATARS: 'avatars',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

/**
 * 上传文件到 Supabase Storage
 */
export async function uploadFile(
    bucket: StorageBucket,
    path: string,
    file: File | Blob,
    options?: {
        cacheControl?: string;
        contentType?: string;
        upsert?: boolean;
    }
) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: options?.cacheControl || '3600',
            contentType: options?.contentType,
            upsert: options?.upsert || false,
        });

    if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    return data;
}

/**
 * 获取文件的公共 URL
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
    const supabase = createSupabaseClient();

    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return data.publicUrl;
}

/**
 * 获取文件的签名 URL（用于私有文件）
 */
export async function getSignedUrl(
    bucket: StorageBucket,
    path: string,
    expiresIn: number = 3600
): Promise<string> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
}

/**
 * 删除文件
 */
export async function deleteFile(bucket: StorageBucket, paths: string | string[]) {
    const supabase = createSupabaseAdminClient();

    const pathsArray = Array.isArray(paths) ? paths : [paths];

    const { data, error } = await supabase.storage
        .from(bucket)
        .remove(pathsArray);

    if (error) {
        throw new Error(`Failed to delete file(s): ${error.message}`);
    }

    return data;
}

/**
 * 列出 bucket 中的文件
 */
export async function listFiles(
    bucket: StorageBucket,
    path: string = '',
    options?: {
        limit?: number;
        offset?: number;
        sortBy?: { column: string; order: 'asc' | 'desc' };
    }
) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.storage
        .from(bucket)
        .list(path, {
            limit: options?.limit || 100,
            offset: options?.offset || 0,
            sortBy: options?.sortBy,
        });

    if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
    }

    return data;
}

/**
 * 创建 Storage Bucket（管理员操作）
 */
export async function createBucket(
    bucketName: string,
    options?: {
        public?: boolean;
        fileSizeLimit?: number;
        allowedMimeTypes?: string[];
    }
) {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: options?.public || false,
        fileSizeLimit: options?.fileSizeLimit,
        allowedMimeTypes: options?.allowedMimeTypes,
    });

    if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
    }

    return data;
}
