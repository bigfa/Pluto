import type { Env } from '@/lib/env';
import type { MediaProvider } from '@/types/admin';
import { publicUrlForKey } from '@/services/admin/mediaProviders';

export interface MediaUrlOverrides {
    url_thumb?: string | null;
    url_medium?: string | null;
    url_large?: string | null;
}

export interface MediaUrlSource {
    url?: string | null;
    provider?: MediaProvider | null;
    object_key?: string | null;
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

function isAbsoluteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

export function resolveMediaBaseUrl(
    source: MediaUrlSource,
    env: Env,
    requestOrigin?: string,
): string {
    const provider = source.provider ?? undefined;
    if (source.object_key && provider) {
        return publicUrlForKey(env, provider, source.object_key, requestOrigin);
    }

    const fallbackUrl = source.url || '';
    if (!fallbackUrl) return '';

    if (provider && !isAbsoluteUrl(fallbackUrl) && !fallbackUrl.startsWith('/')) {
        return publicUrlForKey(env, provider, fallbackUrl, requestOrigin);
    }

    return fallbackUrl;
}

export function resolveMediaOutputUrls(
    env: Env,
    source: MediaUrlSource,
    requestOrigin?: string,
) {
    const baseUrl = resolveMediaBaseUrl(source, env, requestOrigin);
    const urls = baseUrl ? resolveMediaUrls(baseUrl, env) : { url_thumb: undefined, url_medium: undefined, url_large: undefined };
    return {
        url: baseUrl,
        url_thumb: urls.url_thumb,
        url_medium: urls.url_medium,
        url_large: urls.url_large,
    };
}
