import { describe, it, expect } from 'vitest';
import { resolveMediaOutputUrls } from '@/lib/mediaTransforms';
import type { Env } from '@/lib/env';

describe('mediaTransforms', () => {
    it('builds urls from provider + object_key with styles', () => {
        const env: Env = {
            MEDIA_DOMAIN: 'https://cdn.example.com',
            MEDIA_THUMB_STYLE: '?thumb=1',
            MEDIA_MEDIUM_STYLE: '&medium=1',
            MEDIA_LARGE_STYLE: '/large',
        };

        const result = resolveMediaOutputUrls(env, {
            provider: 'r2',
            object_key: '2025/01/test.jpg',
        });

        expect(result.url).toBe('https://cdn.example.com/2025/01/test.jpg');
        expect(result.url_thumb).toBe('https://cdn.example.com/2025/01/test.jpg?thumb=1');
        expect(result.url_medium).toBe('https://cdn.example.com/2025/01/test.jpg?medium=1');
        expect(result.url_large).toBe('https://cdn.example.com/2025/01/test.jpg/large');
    });

    it('handles path-based style with existing query', () => {
        const env: Env = {
            MEDIA_THUMB_STYLE: '/thumb',
        };

        const result = resolveMediaOutputUrls(env, {
            url: 'https://img.example.com/a.jpg?x=1',
        });

        expect(result.url).toBe('https://img.example.com/a.jpg?x=1');
        expect(result.url_thumb).toBe('https://img.example.com/a.jpg/thumb?x=1');
    });
});
