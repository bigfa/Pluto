import {
    MediaListParams,
    MediaListResponse,
    CategoriesResponse,
    Media,
} from "@/types/media";
import { AlbumListResponse, AlbumDetailResponse, AlbumListParams } from '@/types/album';
import { CommentListResponse, PostCommentResponse } from '@/types/comment';

import { getApiBaseUrl } from "@/lib/utils";

// Use /api prefix for internal routes when no external API URL is configured
const API_BASE_URL = getApiBaseUrl();

export async function fetchMediaList(
    params: MediaListParams = {},
): Promise<MediaListResponse> {
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set("q", params.q);
    if (params.provider) searchParams.set("provider", params.provider);
    if (params.folder) searchParams.set("folder", params.folder);
    if (params.make) searchParams.set("make", params.make);
    if (params.model) searchParams.set("model", params.model);
    if (params.category) searchParams.set("category", params.category);
    if (params.tag) searchParams.set("tag", params.tag);
    if (params.createdFrom) searchParams.set("createdFrom", params.createdFrom);
    if (params.createdTo) searchParams.set("createdTo", params.createdTo);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.pageSize)
        searchParams.set("pageSize", params.pageSize.toString());
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.orientation) searchParams.set("orientation", params.orientation);

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/media/list${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export async function fetchCategories(): Promise<CategoriesResponse> {
    const url = `${API_BASE_URL}/media/categories`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}


export async function fetchAlbums(params: AlbumListParams = {}): Promise<AlbumListResponse> {
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set('q', params.q);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/albums${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export async function fetchAlbum(id: string, token?: string): Promise<AlbumDetailResponse> {
    const url = `${API_BASE_URL}/albums/${id}`;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        // Return error response for 403 to be handled by client
        if (response.status === 403) {
            const errorData = await response.json() as { code?: string; data?: unknown };
            throw Object.assign(new Error(`API request failed: ${response.status}`), {
                status: response.status,
                code: errorData.code,
                data: errorData.data
            });
        }
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export interface AlbumMediaResponse {
    ok: boolean;
    media: Media[];
    total: number;
}

export async function fetchAlbumMedia(id: string, params: { page?: number; pageSize?: number; token?: string } = {}): Promise<AlbumMediaResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/albums/${id}/media${queryString ? `?${queryString}` : ''}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (params.token) {
        headers['Authorization'] = `Bearer ${params.token}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        if (response.status === 403) {
            const errorData = await response.json() as { code?: string; data?: unknown };
            throw Object.assign(new Error(`API request failed: ${response.status}`), {
                status: response.status,
                code: errorData.code,
                data: errorData.data
            });
        }
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export interface LikeResponse {
    ok: boolean;
    likes: number;
    liked: boolean;
    error?: string;
}

export async function getLikeInfo(id: string): Promise<LikeResponse> {
    const url = `${API_BASE_URL}/media/${id}/like`;
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return response.json();
}

export async function likeMedia(id: string): Promise<LikeResponse> {
    const url = `${API_BASE_URL}/media/${id}/like`;
    const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return response.json();
}

export async function unlikeMedia(id: string): Promise<LikeResponse> {
    const url = `${API_BASE_URL}/media/${id}/like`;
    const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return response.json();
}

export async function getAlbumLikeInfo(id: string): Promise<LikeResponse> {
    const url = `${API_BASE_URL}/albums/${id}/like`;
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return response.json();
}

export async function likeAlbum(id: string): Promise<LikeResponse> {
    const url = `${API_BASE_URL}/albums/${id}/like`;
    const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return response.json();
}

export async function unlikeAlbum(id: string): Promise<LikeResponse> {
    const url = `${API_BASE_URL}/albums/${id}/like`;
    const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return response.json();
}
export async function recordAlbumView(id: string): Promise<{ ok: boolean; views: number }> {
    const url = `${API_BASE_URL}/albums/${id}/view`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) return { ok: false, views: 0 };
        return response.json();
    } catch (e) {
        console.error("Failed to record album view", e);
        return { ok: false, views: 0 };
    }
}

export async function getAlbumView(id: string): Promise<{ ok: boolean; views: number }> {
    const url = `${API_BASE_URL}/albums/${id}/view`;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) return { ok: false, views: 0 };
        return response.json();
    } catch (e) {
        console.error("Failed to get album view", e);
        return { ok: false, views: 0 };
    }
}

export interface ExtendedCommentListResponse extends CommentListResponse {
    isAdmin?: boolean;
}

export async function fetchAlbumComments(id: string): Promise<ExtendedCommentListResponse> {
    const url = `${API_BASE_URL}/albums/${id}/comments`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for admin check
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export interface PostCommentData {
    author_name?: string;
    author_email?: string;
    author_url?: string;
    content: string;
    parent_id?: string;
}

export async function postAlbumComment(id: string, data: PostCommentData): Promise<PostCommentResponse> {
    const url = `${API_BASE_URL}/albums/${id}/comments`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for admin check
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export async function approveAlbumComment(albumId: string, commentId: string): Promise<{ ok: boolean }> {
    const url = `${API_BASE_URL}/albums/${albumId}/comments/${commentId}/approve`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export interface UnlockAlbumResponse {
    ok: boolean;
    token: string;
}

export async function unlockAlbum(id: string, password: string): Promise<UnlockAlbumResponse> {
    const url = `${API_BASE_URL}/albums/${id}/unlock`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export interface SubscribeResponse {
    ok: boolean;
    token?: string;
    error?: string;
}

export interface SubscriptionStatusResponse {
    ok: boolean;
    enabled: boolean;
}

export async function checkSubscriptionEnabled(): Promise<boolean> {
    try {
        const url = `${API_BASE_URL}/subscribe`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return false;
        }

        const data: SubscriptionStatusResponse = await response.json();
        return data.enabled;
    } catch {
        return false;
    }
}

export async function subscribe(email: string): Promise<SubscribeResponse> {
    const url = `${API_BASE_URL}/subscribe`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || `API request failed: ${response.status}`);
    }

    return response.json();
}
