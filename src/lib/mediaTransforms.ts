import type { Env } from '@/lib/env';

export interface MediaUrlOverrides {
    url_thumb?: string | null;
    url_medium?: string | null;
    url_large?: string | null;
}

function appendStyle(url: string, style?: string): string {
    if (!style) return url;
    const trimmed = style.trim();
    if (!trimmed) return url;

    const [base, query] = url.split('?');
    const hasQuery = query !== undefined;
    const querySuffix = hasQuery ? `?${query}` : '';

    if (trimmed.startsWith('?')) {
        return `${base}${hasQuery ? `${querySuffix}&${trimmed.slice(1)}` : trimmed}`;
    }
    if (trimmed.startsWith('&')) {
        return `${base}${hasQuery ? `${querySuffix}${trimmed}` : `?${trimmed.slice(1)}`}`;
    }

    // Path-based style (e.g. Upyun) should be inserted before query string.
    return `${base}${trimmed}${querySuffix}`;
}

export function resolveMediaUrls(
    url: string,
    env: Env,
    overrides: MediaUrlOverrides = {},
) {
    const thumbStyle = env.MEDIA_THUMB_STYLE?.trim();
    const mediumStyle = env.MEDIA_MEDIUM_STYLE?.trim();
    const largeStyle = env.MEDIA_LARGE_STYLE?.trim();

    return {
        url_thumb: thumbStyle ? appendStyle(url, thumbStyle) : overrides.url_thumb ?? undefined,
        url_medium: mediumStyle ? appendStyle(url, mediumStyle) : overrides.url_medium ?? undefined,
        url_large: largeStyle ? appendStyle(url, largeStyle) : overrides.url_large ?? undefined,
    };
}
