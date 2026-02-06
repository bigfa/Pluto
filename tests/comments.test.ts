import { describe, it, expect } from 'vitest';
import { buildCommentTree } from '@/lib/comments';
import type { Comment } from '@/types/comment';

describe('buildCommentTree', () => {
    it('builds tree, sorts roots desc and children asc, and keeps orphans', () => {
        const comments: Comment[] = [
            {
                id: '1',
                album_id: 'a',
                author_name: 'A',
                content: 'root-1',
                created_at: '2026-02-01T00:00:00.000Z',
            },
            {
                id: '2',
                album_id: 'a',
                author_name: 'B',
                content: 'root-2',
                created_at: '2026-02-02T00:00:00.000Z',
            },
            {
                id: '3',
                album_id: 'a',
                author_name: 'C',
                content: 'child-1',
                created_at: '2026-02-01T01:00:00.000Z',
                parent_id: '1',
            },
            {
                id: '4',
                album_id: 'a',
                author_name: 'D',
                content: 'child-2',
                created_at: '2026-02-01T00:30:00.000Z',
                parent_id: '1',
            },
            {
                id: '5',
                album_id: 'a',
                author_name: 'E',
                content: 'orphan',
                created_at: '2026-02-03T00:00:00.000Z',
                parent_id: 'missing',
            },
        ];

        const result = buildCommentTree(comments);
        expect(result.map((c) => c.id)).toEqual(['5', '2', '1']);

        const rootOne = result.find((c) => c.id === '1');
        expect(rootOne?.children?.map((c) => c.id)).toEqual(['4', '3']);
    });
});
