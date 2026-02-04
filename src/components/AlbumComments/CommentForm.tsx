import React, { useState, useEffect, useRef } from 'react';
import styles from './AlbumComments.module.scss';
import { getCookie, setCookie, COMMENT_AUTHOR_COOKIE_NAME, COMMENT_AUTHOR_EMAIL_COOKIE_NAME } from '@/lib/storage';

interface PostCommentData {
    author_name?: string;
    author_email?: string;
    author_url?: string;
    content: string;
}

interface CommentFormProps {
    onSubmit: (data: PostCommentData) => Promise<void>;
    onCancel?: () => void;
    autoFocus?: boolean;
    initialContent?: string;
    isAdmin?: boolean;
}

export default function CommentForm({ onSubmit, onCancel, autoFocus, initialContent = '', isAdmin = false }: CommentFormProps) {
    const [formData, setFormData] = useState<PostCommentData>({
        author_name: '',
        author_email: '',
        content: initialContent,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Admin doesn't need to fill name/email
        if (isAdmin) {
            if (autoFocus && textareaRef.current) {
                textareaRef.current.focus();
            }
            return;
        }

        const name = getCookie(COMMENT_AUTHOR_COOKIE_NAME);
        const email = getCookie(COMMENT_AUTHOR_EMAIL_COOKIE_NAME);
        if (name || email) {
            setFormData(prev => ({
                ...prev,
                author_name: name || '',
                author_email: email || '',
            }));
        }
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus, isAdmin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate based on admin status
        if (!formData.content.trim() || isSubmitting) return;
        if (!isAdmin && (!formData.author_name?.trim() || !formData.author_email?.trim())) return;

        setIsSubmitting(true);
        try {
            await onSubmit(formData);

            // Save to cookies (only for non-admin users)
            if (!isAdmin && formData.author_name && formData.author_email) {
                setCookie(COMMENT_AUTHOR_COOKIE_NAME, formData.author_name);
                setCookie(COMMENT_AUTHOR_EMAIL_COOKIE_NAME, formData.author_email);
            }

            // Reset content but keep author info
            setFormData(prev => ({
                ...prev,
                content: '',
            }));
        } catch (error) {
            console.error('Failed to submit comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isFormValid = formData.content.trim() && (isAdmin || (formData.author_name?.trim() && formData.author_email?.trim()));

    return (
        <div className={styles['comment-form']}>
            <h3 className={styles['comment-form__title']}>
                {onCancel ? 'Reply to comment' : 'Leave a Comment'}
                {isAdmin && <span className={styles['comment-form__admin-badge']}> (Admin)</span>}
            </h3>
            <form onSubmit={handleSubmit}>
                {!isAdmin && (
                    <div className={styles['comment-form__row']}>
                        <input
                            type="text"
                            name="author_name"
                            className={styles['comment-form__input']}
                            placeholder="Name *"
                            value={formData.author_name || ''}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                        />
                        <input
                            type="email"
                            name="author_email"
                            className={styles['comment-form__input']}
                            placeholder="Email *"
                            value={formData.author_email || ''}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    name="content"
                    className={styles['comment-form__textarea']}
                    placeholder="Write your comment here..."
                    value={formData.content}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required
                />
                <div className={styles['comment-form__actions']}>
                    {onCancel && (
                        <button
                            type="button"
                            className={styles['comment-form__cancel']}
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        className={styles['comment-form__submit']}
                        disabled={!isFormValid || isSubmitting}
                    >
                        {isSubmitting ? 'Posting...' : onCancel ? 'Post Reply' : 'Post Comment'}
                    </button>
                </div>
            </form>
        </div>
    );
}

