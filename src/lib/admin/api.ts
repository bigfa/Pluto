/* eslint-disable @typescript-eslint/no-explicit-any */
// Admin API client

const API_BASE = '';

interface ApiError extends Error {
    status: number;
    body?: unknown;
}

export async function apiFetch<T = unknown>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: HeadersInit = {
        ...options.headers,
    };

    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
        (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) {
        const err = new Error('Request failed') as ApiError;
        err.status = res.status;
        err.body = body;
        throw err;
    }

    return body as T;
}

// Auth
export async function checkAuth(): Promise<{ user: string } | null> {
    try {
        const res = await apiFetch<{ user?: string }>('/api/admin/me');
        return res.user ? { user: res.user } : null;
    } catch {
        return null;
    }
}

export async function login(username: string, password: string): Promise<boolean> {
    try {
        await apiFetch('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        return true;
    } catch {
        return false;
    }
}

export async function logout(): Promise<void> {
    try {
        await apiFetch('/api/admin/logout', { method: 'POST', body: '{}' });
    } catch {
        // Ignore errors
    }
}

// Providers
export interface ProviderInfo {
    value: string;
    label: string;
    available: boolean;
}

export async function listProviders(): Promise<{ providers: ProviderInfo[]; defaultProvider: string }> {
    return apiFetch('/api/admin/providers');
}

// Media types
export interface MediaItem {
    id: string;
    filename?: string;
    url: string;
    url_thumb?: string;
    url_medium?: string;
    url_large?: string;
    provider: string;
    title?: string;
    alt?: string;
    camera_make?: string;
    camera_model?: string;
    lens_model?: string;
    aperture?: string;
    shutter_speed?: string;
    iso?: string;
    focal_length?: string;
    datetime_original?: string;
    gps_lat?: number;
    gps_lon?: number;
    location_name?: string;
    exif_json?: string;
    category_ids?: string[];
    categories?: { id: string; name: string; slug: string }[];
    tags?: string[];
    visibility?: string;
    created_at: string;
}

export interface MediaCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
    display_order: number;
    show_in_frontend?: number | boolean;
    media_count: number;
    created_at: string;
}

export interface MediaTag {
    tag: string;
    count: number;
}

export interface DeviceStats {
    cameras: { make?: string; model?: string; count: number }[];
    lenses: { model?: string; count: number }[];
}

export interface MediaListResponse {
    ok: boolean;
    results: MediaItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface UploadMediaResponse {
    ok: boolean;
    data: MediaItem[];
    successCount: number;
    failCount: number;
    failures?: { name: string; error: string }[];
}

// Media API
export async function listMedia(params: {
    q?: string;
    category?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
}): Promise<MediaListResponse> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.category) searchParams.set('category', params.category);
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

    return apiFetch(`/api/admin/media/list?${searchParams}`);
}

export async function uploadMedia(formData: FormData): Promise<UploadMediaResponse> {
    return apiFetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
    });
}

export function uploadMediaWithProgress(
    formData: FormData,
    onProgress?: (percent: number) => void,
): Promise<UploadMediaResponse> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/api/admin/media/upload`, true);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress?.(percent);
            }
        };

        xhr.onload = () => {
            const contentType = xhr.getResponseHeader('content-type') || '';
            const isJson = contentType.includes('application/json');
            const body = isJson ? JSON.parse(xhr.responseText) : xhr.responseText;

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(body as UploadMediaResponse);
                return;
            }

            const err = new Error('Request failed') as ApiError;
            err.status = xhr.status;
            err.body = body;
            reject(err);
        };

        xhr.onerror = () => {
            const err = new Error('Network error') as ApiError;
            err.status = xhr.status || 0;
            reject(err);
        };

        xhr.send(formData);
    });
}

export async function updateMedia(
    id: string,
    data: { title?: string; alt?: string; category_ids?: string[]; tags?: string[]; visibility?: string }
): Promise<{ ok: boolean; data: MediaItem }> {
    return apiFetch(`/api/admin/media/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteMedia(id: string): Promise<void> {
    await apiFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
}

// Categories API
export async function listCategories(): Promise<{ ok: boolean; categories: MediaCategory[] }> {
    return apiFetch('/api/admin/media/categories');
}

export async function createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    show_in_frontend?: boolean;
}): Promise<{ ok: boolean; data: MediaCategory }> {
    return apiFetch('/api/admin/media/categories', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateCategory(
    id: string,
    data: { name?: string; slug?: string; description?: string; show_in_frontend?: boolean }
): Promise<{ ok: boolean; data: MediaCategory }> {
    return apiFetch(`/api/admin/media/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteCategory(id: string): Promise<void> {
    await apiFetch(`/api/admin/media/categories/${id}`, { method: 'DELETE' });
}

// Tags API
export async function listTags(): Promise<{ ok: boolean; tags: MediaTag[] }> {
    return apiFetch('/api/admin/media/tags');
}

export async function listDeviceStats(): Promise<{ ok: boolean; cameras: DeviceStats['cameras']; lenses: DeviceStats['lenses'] }> {
    return apiFetch('/api/admin/media/devices');
}

// Album Comments API
export interface CommentItem {
    id: string;
    post_id: string;
    comment_author_name: string;
    comment_author_email: string;
    comment_author_url?: string;
    comment_content: string;
    comment_date: string;
    comment_status: string;
    comment_parent?: string;
    comment_type?: string;
    post_title?: string;
    avatar?: string;
}

export async function listAlbumComments(page: number = 1, status: string = 'all'): Promise<{ ok: boolean; results: CommentItem[]; total: number; page: number; pageSize: number }> {
    const query = new URLSearchParams({ page: page.toString(), pageSize: '20', status });
    const res = await apiFetch<any>(`/api/admin/album-comments?${query.toString()}`);

    const results = (res.results || []).map((c: any) => ({
        id: c.id,
        post_id: c.album_id,
        comment_author_name: c.author_name,
        comment_author_email: c.author_email,
        comment_author_url: c.author_url,
        comment_content: c.content,
        comment_date: c.created_at,
        comment_status: c.status,
        comment_parent: c.parent_id,
        comment_type: 'album',
        avatar: c.avatar
    }));

    return {
        ok: true,
        results,
        total: res.total,
        page: res.page,
        pageSize: res.pageSize
    };
}

export async function approveAlbumComment(id: string): Promise<void> {
    await apiFetch(`/api/admin/album-comments/${id}/approve`, { method: 'POST', body: '{}' });
}

export async function deleteAlbumComment(id: string): Promise<void> {
    await apiFetch(`/api/admin/album-comments/${id}`, { method: 'DELETE' });
}

// Albums API
export interface AlbumItem {
    id: string;
    title: string;
    description?: string;
    cover_media_id?: string;
    cover_media?: MediaItem;
    created_at: string;
    updated_at: string;
    media_count: number;
    likes?: number;
    liked?: boolean;
    views?: number;
    slug?: string;
    tags?: string[];
    categories?: { id: string; name: string; slug: string }[];
    category_ids?: string[];
    is_protected?: boolean;
    status?: 'draft' | 'published';
}

export async function listAlbums(page: number = 1, q: string = '', tag: string = ''): Promise<{ ok: boolean; albums: AlbumItem[]; total: number; totalPages: number }> {
    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (q) query.set('q', q);
    if (tag) query.set('tag', tag);
    return apiFetch(`/api/admin/albums?${query.toString()}`);
}

export async function createAlbum(data: { title: string; description?: string; cover_media_id?: string; slug?: string; tags?: string[]; category_ids?: string[]; password?: string; status?: 'draft' | 'published' }): Promise<{ ok: boolean; data: AlbumItem }> {
    return apiFetch('/api/admin/albums', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateAlbum(id: string, data: { title?: string; description?: string; cover_media_id?: string; slug?: string; tags?: string[]; category_ids?: string[]; password?: string; status?: 'draft' | 'published' }): Promise<{ ok: boolean; data: AlbumItem }> {
    return apiFetch(`/api/admin/albums/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

// Album Categories API
export interface AlbumCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
    display_order: number;
    show_in_frontend?: number | boolean;
    media_count: number;
    created_at: string;
}

export async function listAlbumCategories(): Promise<{ ok: boolean; categories: AlbumCategory[] }> {
    return apiFetch('/api/admin/albums/categories');
}

export async function createAlbumCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    show_in_frontend?: boolean;
}): Promise<{ ok: boolean; data: AlbumCategory }> {
    return apiFetch('/api/admin/albums/categories', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateAlbumCategory(
    id: string,
    data: { name?: string; slug?: string; description?: string; show_in_frontend?: boolean }
): Promise<{ ok: boolean; data: AlbumCategory }> {
    return apiFetch(`/api/admin/albums/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteAlbumCategory(id: string): Promise<void> {
    await apiFetch(`/api/admin/albums/categories/${id}`, { method: 'DELETE' });
}

export async function deleteAlbum(id: string): Promise<void> {
    await apiFetch(`/api/admin/albums/${id}`, { method: 'DELETE' });
}

export async function getAlbumById(id: string): Promise<{ ok: boolean; data: AlbumItem }> {
    return apiFetch(`/api/admin/albums/${id}`);
}

export async function getAlbumMedia(id: string, page: number = 1, pageSize: number = 50): Promise<{ ok: boolean; media: MediaItem[]; total: number }> {
    return apiFetch(`/api/admin/albums/${id}/media?page=${page}&pageSize=${pageSize}`);
}

export async function addMediaToAlbum(id: string, mediaIds: string[]): Promise<void> {
    await apiFetch(`/api/admin/albums/${id}/media`, {
        method: 'POST',
        body: JSON.stringify({ media_ids: mediaIds }),
    });
}

export async function removeMediaFromAlbum(id: string, mediaIds: string[]): Promise<void> {
    await apiFetch(`/api/admin/albums/${id}/media`, {
        method: 'DELETE',
        body: JSON.stringify({ media_ids: mediaIds }),
    });
}

export async function generateAlbumOTP(id: string): Promise<{ ok: boolean; otp: string }> {
    return apiFetch(`/api/admin/albums/${id}/otp`, { method: 'POST', body: '{}' });
}

// Subscribers API
export interface SubscriberItem {
    id: string;
    email: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export async function listSubscribers(page: number = 1): Promise<{ ok: boolean; subscribers: SubscriberItem[]; total: number }> {
    return apiFetch(`/api/admin/subscribers?page=${page}&pageSize=20`);
}

// Newsletters API
export interface NewsletterItem {
    id: string;
    subject: string;
    content: string;
    type: string;
    recipients_count: number;
    status: string;
    created_at: string;
    sent_at: string | null;
}

export async function listNewsletters(page: number = 1): Promise<{ ok: boolean; newsletters: NewsletterItem[]; total: number }> {
    return apiFetch(`/api/admin/newsletters?page=${page}&pageSize=20`);
}

export async function createNewsletter(data: { subject: string; content: string; type?: string }): Promise<{ ok: boolean; newsletter: NewsletterItem }> {
    return apiFetch('/api/admin/newsletters', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function sendNewsletter(id: string): Promise<{ ok: boolean; sent: number }> {
    return apiFetch('/api/admin/newsletters', {
        method: 'POST',
        body: JSON.stringify({ action: 'send', id }),
    });
}
