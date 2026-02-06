import { describe, it, expect } from 'vitest';
import { parseCommentMarkdown } from '@/lib/markdown';

describe('parseCommentMarkdown', () => {
    it('escapes html and renders bold and inline code', () => {
        const input = `Hello <b>bad</b> **bold** and \`code\``;
        const output = parseCommentMarkdown(input);
        expect(output).toBe('Hello &lt;b&gt;bad&lt;&#x2F;b&gt; <strong>bold</strong> and <code>code</code>');
    });

    it('renders blockquotes with line breaks', () => {
        const input = `> first\n> second`;
        const output = parseCommentMarkdown(input);
        expect(output).toBe('<blockquote>first<br>second</blockquote>');
    });

    it('renders fenced code blocks', () => {
        const input = '```js\nconst x = 1;\n```';
        const output = parseCommentMarkdown(input);
        expect(output).toBe('<pre><code>js<br>const x = 1;</code></pre>');
    });
});
