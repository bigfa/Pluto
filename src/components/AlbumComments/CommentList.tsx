import React from 'react';
import { Comment } from '@/types/comment';
import { PostCommentData } from '@/lib/api';
import CommentItem from './CommentItem';
import styles from './AlbumComments.module.scss';

interface CommentListProps {
    comments: Comment[]; // These should be tree roots
    onReply: (data: PostCommentData) => Promise<void>;
    onApprove: (commentId: string) => Promise<void>;
    activeReplyId: string | null;
    setActiveReplyId: (id: string | null) => void;
    isAdmin: boolean;
}

export default function CommentList({ comments, onReply, onApprove, activeReplyId, setActiveReplyId, isAdmin }: CommentListProps) {
    if (comments.length === 0) {
        return (
            <div className={styles['album-comments__empty']}>
                <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
        );
    }

    return (
        <div className={styles['album-comments__list']}>
            {comments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={onReply}
                    onApprove={onApprove}
                    activeReplyId={activeReplyId}
                    setActiveReplyId={setActiveReplyId}
                    isAdmin={isAdmin}
                />
            ))}
        </div>
    );
}
