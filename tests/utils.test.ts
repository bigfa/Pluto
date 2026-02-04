import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

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
});
