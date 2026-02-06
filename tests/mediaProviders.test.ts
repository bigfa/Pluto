import { describe, it, expect } from 'vitest';
import { publicUrlForKey } from '@/services/admin/mediaProviders';
import type { Env } from '@/lib/env';

describe('mediaProviders.publicUrlForKey', () => {
    it('prefers MEDIA_DOMAIN for non-local providers', () => {
        const env: Env = {
            MEDIA_DOMAIN: 'https://cdn.example.com',
            R2_DOMAIN: 'https://r2.example.com',
        };

        const url = publicUrlForKey(env, 'r2', 'path/to/image.jpg');
        expect(url).toBe('https://cdn.example.com/path/to/image.jpg');
    });

    it('builds local url using MEDIA_LOCAL_PUBLIC_URL with NEXT_PUBLIC_BASE_URL', () => {
        const env: Env = {
            MEDIA_LOCAL_PUBLIC_URL: '/uploads',
            NEXT_PUBLIC_BASE_URL: 'https://site.example.com',
        };

        const url = publicUrlForKey(env, 'local', 'a/b.jpg');
        expect(url).toBe('https://site.example.com/uploads/a/b.jpg');
    });

    it('builds local url using requestOrigin when NEXT_PUBLIC_BASE_URL is missing', () => {
        const env: Env = {
            MEDIA_LOCAL_PUBLIC_URL: '/uploads',
        };

        const url = publicUrlForKey(env, 'local', 'a/b.jpg', 'https://origin.example.com');
        expect(url).toBe('https://origin.example.com/uploads/a/b.jpg');
    });
});
