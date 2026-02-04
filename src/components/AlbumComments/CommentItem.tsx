import React, { useState } from 'react';
import Image from 'next/image';
import { Comment } from '@/types/comment';
import { PostCommentData } from '@/lib/api';
import { User, MessageSquare, CheckCircle } from 'lucide-react';
import CommentForm from './CommentForm';
import styles from './AlbumComments.module.scss';

interface CommentItemProps {
    comment: Comment;
    onReply: (data: PostCommentData) => Promise<void>;
    onApprove: (commentId: string) => Promise<void>;
    activeReplyId: string | null;
    setActiveReplyId: (id: string | null) => void;
    isAdmin: boolean;
}

export default function CommentItem({ comment, onReply, onApprove, activeReplyId, setActiveReplyId, isAdmin }: CommentItemProps) {
    const isReplying = activeReplyId === comment.id;
    const [approving, setApproving] = useState(false);
    const isPending = comment.status === 'pending';

    const handleReplySubmit = async (data: PostCommentData) => {
        await onReply({ ...data, parent_id: comment.id });
    };

    const handleApprove = async () => {
        setApproving(true);
        try {
            await onApprove(comment.id);
        } finally {
            setApproving(false);
        }
    };

    return (
        <div className={`${styles['comment-item']} ${isPending ? styles['comment-item--pending'] : ''}`}>
            <div className={styles['comment-item__avatar']}>
                {comment.avatar ? (
                    <Image
                        src={comment.avatar}
                        alt={comment.author_name}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        <User size={20} />
                    </div>
                )}
            </div>
            <div className={styles['comment-item__content']}>
                <div className={styles['comment-item__header']}>
                    <span className={styles['comment-item__author']}>{comment.author_name}</span>
                    <span className={styles['comment-item__date']}>
                        {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                    {isPending && (
                        <span className={styles['comment-item__pending-badge']}>
                            Pending
                        </span>
                    )}
                </div>
                <div
                    className={styles['comment-item__text']}
                    dangerouslySetInnerHTML={comment.content_html ? { __html: comment.content_html } : undefined}
                >
                    {!comment.content_html ? comment.content : null}
                </div>

                <div className={styles['comment-item__actions']}>
                    <button
                        className={styles['comment-item__reply-btn']}
                        onClick={() => setActiveReplyId(isReplying ? null : comment.id)}
                    >
                        <MessageSquare size={14} />
                        {isReplying ? 'Cancel' : 'Reply'}
                    </button>
                    {isAdmin && isPending && (
                        <button
                            className={styles['comment-item__approve-btn']}
                            onClick={handleApprove}
                            disabled={approving}
                        >
                            <CheckCircle size={14} />
                            {approving ? 'Approving...' : 'Approve'}
                        </button>
                    )}
                </div>

                {isReplying && (
                    <div className={styles['comment-item__reply-form']}>
                        <CommentForm
                            onSubmit={handleReplySubmit}
                            onCancel={() => setActiveReplyId(null)}
                            autoFocus
                            isAdmin={isAdmin}
                        />
                    </div>
                )}

                {comment.children && comment.children.length > 0 && (
                    <div className={styles['comment-item__replies']}>
                        {comment.children.map(child => (
                            <CommentItem
                                key={child.id}
                                comment={child}
                                onReply={onReply}
                                onApprove={onApprove}
                                activeReplyId={activeReplyId}
                                setActiveReplyId={setActiveReplyId}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
