import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLikes, toggleLike } from '@/services/likeServices';
import { Env } from '@/lib/env';

// Mock getDb to avoid real DB calls
vi.mock('@/db/client', () => ({
    getDb: vi.fn(),
}));

describe('likeServices', () => {
    let env: Env;
    const mediaId = 'test-media-id';
    const ip = '127.0.0.1';

    beforeEach(() => {
        // Mock Env with FARALLON KV
        env = {
            FARALLON: {
                get: vi.fn(),
                put: vi.fn(),
                delete: vi.fn(),
            },
        } as unknown as Env;
    });

    describe('getLikes', () => {
        it('should return 0 likes if not set', async () => {
            (env.FARALLON.get as any).mockResolvedValue(null);
            const result = await getLikes(env, mediaId, ip);
            expect(result).toEqual({ ok: true, likes: 0, liked: false });
        });

        it('should return correct like count and liked status', async () => {
            (env.FARALLON.get as any)
                .mockResolvedValueOnce('5') // likes:mediaId
                .mockResolvedValueOnce('true'); // liked:mediaId:ip

            const result = await getLikes(env, mediaId, ip);
            expect(result).toEqual({ ok: true, likes: 5, liked: true });
        });
    });

    describe('toggleLike', () => {
        it('should increment likes', async () => {
            // Mock hasLiked check
            (env.FARALLON.get as any).mockResolvedValueOnce(null);
            // Mock current like count
            (env.FARALLON.get as any).mockResolvedValueOnce('10');

            const result = await toggleLike(env, mediaId, ip, 'like');

            expect(env.FARALLON.put).toHaveBeenCalledWith(
                `likes:${mediaId}`,
                '11'
            );
            expect(result.likes).toBe(11);
            expect(result.liked).toBe(true);
        });

        it('should decrement likes', async () => {
            // Mock hasLiked check
            (env.FARALLON.get as any).mockResolvedValueOnce('true'); // user has liked
            // Mock current like count
            (env.FARALLON.get as any).mockResolvedValueOnce('10'); // current total

            const result = await toggleLike(env, mediaId, ip, 'unlike');

            expect(env.FARALLON.put).toHaveBeenCalledWith(
                `likes:${mediaId}`,
                '9'
            );
            expect(env.FARALLON.delete).toHaveBeenCalled();
            expect(result.likes).toBe(9);
            expect(result.liked).toBe(false);
        });
    });
});
