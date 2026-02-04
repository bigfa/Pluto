export interface Album {
    id: string;
    title: string;
    description: string;
    cover_media_id: string;
    media_count: number;
    views?: number;
    likes?: number;
    created_at: string;
    updated_at: string;
    slug?: string;
    cover_media?: {
        id: string;
        url: string;
        url_medium?: string;
    };
    is_protected?: boolean;
}

export interface AlbumListResponse {
    ok: boolean;
    albums: Album[];
    total: number;
    totalPages: number;
}

export interface AlbumDetailResponse {
    ok: boolean;
    data: Album;
}

export interface AlbumListParams {
    q?: string;
    page?: number;
    pageSize?: number;
}
