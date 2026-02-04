import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Comment } from '@/types/comment';
import { fetchAlbumComments, postAlbumComment, approveAlbumComment, PostCommentData } from '@/lib/api';
import { buildCommentTree } from '@/lib/comments';
import CommentList from './CommentList';
import CommentForm from './CommentForm';
import styles from './AlbumComments.module.scss';

interface AlbumCommentsProps {
    albumId: string;
}

export default function AlbumComments({ albumId }: AlbumCommentsProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const loadComments = useCallback(async () => {
        try {
            const response = await fetchAlbumComments(albumId);
            if (response.ok) {
                setComments(response.comments);
                setIsAdmin(response.isAdmin || false);
            }
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoading(false);
        }
    }, [albumId]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

    const handleSubmitComment = async (data: PostCommentData) => {
        const response = await postAlbumComment(albumId, data);
        if (response.ok) {
            // Refresh comments after successful post
            await loadComments();
            // Close any active reply
            setActiveReplyId(null);
        }
    };

    const handleApproveComment = async (commentId: string) => {
        try {
            const response = await approveAlbumComment(albumId, commentId);
            if (response.ok) {
                // Refresh comments to show updated status
                await loadComments();
            }
        } catch (error) {
            console.error('Failed to approve comment:', error);
        }
    };

    return (
        <div className={styles['album-comments']}>
            <h2 className={styles['album-comments__title']}>Comments</h2>
            {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading comments...</div>
            ) : (
                <CommentList
                    comments={commentTree}
                    onReply={handleSubmitComment}
                    onApprove={handleApproveComment}
                    activeReplyId={activeReplyId}
                    setActiveReplyId={setActiveReplyId}
                    isAdmin={isAdmin}
                />
            )}
            {!activeReplyId && <CommentForm onSubmit={handleSubmitComment} isAdmin={isAdmin} />}
        </div>
    );
}
