'use client';

import { useState, useCallback } from 'react';
import styles from './LikeButton.module.scss';

interface LikeButtonProps {
    likes: number;
    liked: boolean;
    onToggle: () => Promise<{ likes: number; liked: boolean } | null>;
    size?: 'small' | 'medium' | 'large';
    showCount?: boolean;
}

export default function LikeButton({
    likes,
    liked,
    onToggle,
    size = 'medium',
    showCount = true
}: LikeButtonProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [localLikes, setLocalLikes] = useState(likes);
    const [localLiked, setLocalLiked] = useState(liked);

    const handleClick = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (isLoading) return;

        // Optimistic update
        const prevLikes = localLikes;
        const prevLiked = localLiked;

        setLocalLiked(!localLiked);
        setLocalLikes(localLiked ? localLikes - 1 : localLikes + 1);
        setIsAnimating(true);
        setIsLoading(true);

        try {
            const result = await onToggle();
            if (result) {
                setLocalLikes(result.likes);
                setLocalLiked(result.liked);
            }
        } catch {
            // Rollback on error
            setLocalLikes(prevLikes);
            setLocalLiked(prevLiked);
        } finally {
            setIsLoading(false);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [isLoading, localLikes, localLiked, onToggle]);

    // Sync with prop changes
    if (likes !== localLikes && !isLoading) {
        setLocalLikes(likes);
    }
    if (liked !== localLiked && !isLoading) {
        setLocalLiked(liked);
    }

    return (
        <button
            className={`${styles.likeButton} ${styles[size]} ${localLiked ? styles.liked : ''} ${isAnimating ? styles.animating : ''}`}
            onClick={handleClick}
            disabled={isLoading}
            aria-label={localLiked ? 'Unlike' : 'Like'}
        >
            <svg
                className={styles.heart}
                viewBox="0 0 24 24"
                fill={localLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {showCount && (
                <span className={styles.count}>{localLikes}</span>
            )}
        </button>
    );
}
