/**
 * Lightweight Markdown Parser
 * Supports: Bold, Blockquote, Inline Code, Code Block
 */

import { encodeForHTML } from "./utils";

/**
 * Parse markdown content in comments
 * @param content Original content
 * @returns Parsed HTML
 */
export function parseCommentMarkdown(content: string): string {
    if (!content) return "";

    // HTML Escape
    let result = encodeForHTML(content);

    // 1. Code Blocks (```code```)
    result = result.replace(
        /```([\s\S]*?)```/g,
        (_, code) => `<pre><code>${code.trim()}</code></pre>`
    );

    // 2. Inline Code (`code`)
    result = result.replace(
        /`([^`\n]+)`/g,
        (_, code) => `<code>${code}</code>`
    );

    // 3. Bold (**text** or __text__)
    result = result.replace(
        /\*\*([^*]+)\*\*/g,
        (_, text) => `<strong>${text}</strong>`
    );
    result = result.replace(
        /__([^_]+)__/g,
        (_, text) => `<strong>${text}</strong>`
    );

    // 4. Blockquote (> text)
    const lines = result.split("\n");
    const processedLines: string[] = [];
    let inBlockquote = false;
    let blockquoteContent: string[] = [];

    for (const line of lines) {
        const quoteMatch = line.match(/^&gt;\s?(.*)$/);
        if (quoteMatch) {
            if (!inBlockquote) {
                inBlockquote = true;
                blockquoteContent = [];
            }
            blockquoteContent.push(quoteMatch[1]);
        } else {
            if (inBlockquote) {
                processedLines.push(
                    `<blockquote>${blockquoteContent.join("<br>")}</blockquote>`
                );
                inBlockquote = false;
                blockquoteContent = [];
            }
            processedLines.push(line);
        }
    }

    if (inBlockquote) {
        processedLines.push(
            `<blockquote>${blockquoteContent.join("<br>")}</blockquote>`
        );
    }

    result = processedLines.join("\n");

    // 5. Convert newlines to <br> (excluding inside pre/blockquote)
    result = result.replace(
        /\n(?![^<]*<\/(pre|blockquote)>)/g,
        "<br>"
    );

    return result;
}
