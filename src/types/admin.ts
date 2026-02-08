export type MediaProvider = 'r2' | 'upyun' | 'cos' | 'local';

export interface MediaCreate {
    id?: string;
    filename?: string;
    url: string;
    provider: MediaProvider;
    object_key: string;
    size?: number;
    mime_type?: string;
    width?: number;
    height?: number;
    thumb_url?: string;
    file_hash?: string;
    title?: string;
    alt?: string;
    description?: string;
    exif_json?: string;
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
    visibility?: string;
    created_at?: string;
    updated_at?: string;
    tags?: string[];
    category_ids?: string[];
}

export interface MediaUpdate {
    title?: string;
    alt?: string;
    description?: string;
    category_ids?: string[];
    tags?: string[];
    visibility?: string;
    updated_at?: string;
}

export interface MediaFile {
    id: string;
    filename?: string;
    url: string;
    provider: MediaProvider;
    object_key: string;
    size?: number;
    mime_type?: string;
    width?: number;
    height?: number;
    url_thumb?: string;
    url_medium?: string;
    url_large?: string;
    file_hash?: string;
    title?: string;
    alt?: string;
    exif_json?: string;
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
    likes?: number;
    view_count?: number;
    visibility?: string;
    tags?: string[];
    categories?: { id: string; name: string }[];
    category_ids?: string[];
    created_at: string;
    updated_at?: string;
}

export interface AlbumCreate {
    title: string;
    description?: string;
    cover_media_id?: string;
    slug?: string;
    tags?: string[];
    category_ids?: string[];
    password?: string;
    status?: 'draft' | 'published';
}

export interface AlbumUpdate {
    title?: string;
    description?: string;
    cover_media_id?: string;
    slug?: string;
    tags?: string[];
    category_ids?: string[];
    password?: string;
    status?: 'draft' | 'published';
}

export interface AlbumComment {
    id: string;
    album_id: string;
    author_name: string;
    author_email: string;
    author_url?: string;
    author_ip?: string;
    content: string;
    status: 'pending' | 'approved' | 'spam';
    parent_id?: string;
    created_at: string;
}

export interface TagWithCount {
    tag: string;
    count: number;
}
