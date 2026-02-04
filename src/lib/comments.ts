import { Comment } from '@/types/comment';

export function buildCommentTree(comments: Comment[]): Comment[] {
    const commentMap = new Map<string, Comment>();
    const roots: Comment[] = [];

    // First pass: create copies and map them
    comments.forEach(comment => {
        // Create a shallow copy to incorporate children without mutating original if needed
        // but typically we can just attach children.
        // Initialize children array
        const commentWithChildren = { ...comment, children: [] };
        commentMap.set(comment.id, commentWithChildren);
    });

    // Second pass: link children to parents
    comments.forEach(originalComment => {
        const comment = commentMap.get(originalComment.id)!;
        if (comment.parent_id) {
            const parent = commentMap.get(comment.parent_id);
            if (parent) {
                parent.children!.push(comment);
            } else {
                // Parent not found (orphan), maybe treat as root or ignore?
                // Treating as root for safety
                roots.push(comment);
            }
        } else {
            roots.push(comment);
        }
    });

    // Sort by date (descending for roots, ascending/descending for children?)
    // Typically roots are newest first.
    roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Sort children (chronological usually makes sense for conversation flow)
    const sortChildren = (nodes: Comment[]) => {
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                node.children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                sortChildren(node.children);
            }
        });
    };

    sortChildren(roots);

    return roots;
}
