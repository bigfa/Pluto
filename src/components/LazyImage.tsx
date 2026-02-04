'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './LazyImage.module.scss';

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    placeholderColor?: string;
    threshold?: number;
    rootMargin?: string;
    sizes?: string;
    onLoadSize?: (size: { width: number; height: number }) => void;
}

export default function LazyImage({
    src,
    alt,
    className = '',
    placeholderColor = 'var(--color-surface-elevated)',
    threshold = 0.1,
    rootMargin = '100px',
    sizes = '100vw',
    onLoadSize,
}: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const element = imgRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [threshold, rootMargin]);

    const handleLoad = useCallback((event?: React.SyntheticEvent<HTMLImageElement>) => {
        if (event?.currentTarget?.naturalWidth && event.currentTarget.naturalHeight) {
            onLoadSize?.({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
            });
        }
        setIsLoaded(true);
    }, [onLoadSize]);

    const handleError = useCallback(() => {
        setHasError(true);
        setIsLoaded(true);
    }, []);

    return (
        <div
            ref={imgRef}
            className={`${styles.lazyImageWrapper} ${className}`}
            style={{ '--placeholder-color': placeholderColor } as React.CSSProperties}
        >
            {/* Skeleton/placeholder */}
            <div className={`${styles.placeholder} ${isLoaded ? styles.loaded : ''}`}>
                <div className={styles.shimmer} />
            </div>

            {/* Actual image - only render when in view */}
            {isInView && !hasError && (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes={sizes}
                    className={`${styles.image} ${isLoaded ? styles.loaded : ''}`}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading="lazy"
                    unoptimized
                />
            )}

            {/* Error state */}
            {hasError && (
                <div className={styles.errorState}>
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </div>
            )}
        </div>
    );
}
