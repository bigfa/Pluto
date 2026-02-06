import { describe, it, expect, afterEach } from 'vitest';
import { cn, encodeForHTML, getApiBaseUrl } from '@/lib/utils';

describe('utils', () => {
    describe('cn', () => {
        it('should merge class names', () => {
            expect(cn('foo', 'bar')).toBe('foo bar');
        });

        it('should handle conditional classes', () => {
            expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
        });

        it('should handle tailwind conflicts', () => {
            expect(cn('p-4', 'p-2')).toBe('p-2');
        });
    });

    describe('encodeForHTML', () => {
        it('should escape special characters', () => {
            expect(encodeForHTML(`<&>"'/`)).toBe('&lt;&amp;&gt;&quot;&#x27;&#x2F;');
        });
    });

    describe('getApiBaseUrl', () => {
        const originalEnv = { ...process.env };
        const originalWindow = (globalThis as any).window;

        afterEach(() => {
            process.env = { ...originalEnv };
            if (typeof originalWindow === 'undefined') {
                delete (globalThis as any).window;
            } else {
                (globalThis as any).window = originalWindow;
            }
        });

        it('uses NEXT_PUBLIC_API_BASE_URL when set', () => {
            process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';
            expect(getApiBaseUrl()).toBe('https://api.example.com');
        });

        it('uses NEXT_PUBLIC_BASE_URL on server when API base is not set', () => {
            delete (globalThis as any).window;
            process.env.NEXT_PUBLIC_BASE_URL = 'https://site.example.com';
            expect(getApiBaseUrl()).toBe('https://site.example.com/api');
        });

        it('uses relative /api on client when API base is not set', () => {
            (globalThis as any).window = {};
            delete process.env.NEXT_PUBLIC_API_BASE_URL;
            delete process.env.NEXT_PUBLIC_BASE_URL;
            expect(getApiBaseUrl()).toBe('/api');
        });
    });
});
