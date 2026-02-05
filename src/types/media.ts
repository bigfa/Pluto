export interface ExifValue {
    value: number | number[] | string[];
    description: string | number;
}

export interface ExifData {
    Make?: ExifValue;
    Model?: ExifValue;
    LensModel?: ExifValue;
    DateTimeOriginal?: ExifValue;
    FNumber?: ExifValue;
    ExposureTime?: ExifValue;
    ISOSpeedRatings?: ExifValue;
    FocalLength?: ExifValue;
    Orientation?: ExifValue;
    gps?: Record<string, unknown>;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    display_order?: number;
    media_count?: number;
    show_in_frontend?: boolean;
    created_at?: string;
}

export interface CategoriesResponse {
    ok: boolean;
    categories: Category[];
}

export interface Media {
    id: string;
    url: string;
    filename: string;
    alt: string;
    size: number;
    width: number | null;
    height: number | null;
    created_at: string;
    likes: number;
    liked: boolean;
    category_ids: string[];
    categories: Category[];
    tags: string[];
    location_name?: string | null;
    camera_make?: string | null;
    camera_model?: string | null;
    lens_model?: string | null;
    aperture?: string | null;
    shutter_speed?: string | null;
    iso?: string | null;
    focal_length?: string | null;
    datetime_original?: string | null;
    exif_json?: string | null;
    url_thumb?: string | null;
    url_medium?: string | null;
    url_large?: string | null;
    provider?: string;
    object_key?: string;
    mime?: string;
    title?: string;
    gps_lat?: number | null;
    gps_lon?: number | null;
    updated_at?: string | null;
}

export interface MediaListResponse {
    ok: boolean;
    results: Media[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface MediaListParams {
    q?: string;
    provider?: string;
    folder?: string;
    make?: string;
    model?: string;
    category?: string;
    tag?: string;
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    pageSize?: number;
    sort?: 'date' | 'likes';
    orientation?: 'landscape' | 'portrait' | 'square';
}

// Helper function to parse EXIF JSON
export function parseExifJson(exifJson: string | null | undefined): ExifData | null {
    if (!exifJson) return null;
    try {
        return JSON.parse(exifJson) as ExifData;
    } catch {
        return null;
    }
}

// Helper function to get EXIF display values
export function getExifDisplayValues(exif: ExifData | null) {
    if (!exif) return null;

    return {
        aperture: exif.FNumber?.description?.toString() || null,
        shutter: exif.ExposureTime?.description?.toString() || null,
        iso: exif.ISOSpeedRatings?.description?.toString() || null,
        focalLength: exif.FocalLength?.description?.toString() || null,
        lens: exif.LensModel?.description?.toString() || null,
    };
}
