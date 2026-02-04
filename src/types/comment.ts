export interface Comment {
    id: string;
    album_id: string;
    author_name: string;
    author_url?: string;
    avatar?: string; // Optional local/gravatar helper
    content: string;
    content_html?: string;
    created_at: string;
    likes?: number;
    parent_id?: string | null;
    status?: 'pending' | 'approved';
    children?: Comment[];
}

export interface CommentListResponse {
    ok: boolean;
    comments: Comment[];
}

export interface PostCommentResponse {
    ok: boolean;
    data: {
        id: string;
        status: string;
    };
}

