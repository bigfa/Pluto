'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Media, parseExifJson, getExifDisplayValues } from '@/types/media';
import LikeButton from './LikeButton';
import styles from './LightBox.module.scss';

interface LightBoxProps {
    media: Media | null;
    onClose: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    onLike?: (media: Media) => Promise<{ likes: number; liked: boolean } | null>;
}

export default function LightBox({
    media,
    onClose,
    onPrev,
    onNext,
    hasPrev = false,
    hasNext = false,
    onLike
}: LightBoxProps) {
    const handleLike = async () => {
        if (onLike && media) {
            return onLike(media);
        }
        return null;
    };
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowLeft' && onPrev && hasPrev) {
            onPrev();
        } else if (e.key === 'ArrowRight' && onNext && hasNext) {
            onNext();
        }
    }, [onClose, onPrev, onNext, hasPrev, hasNext]);

    useEffect(() => {
        if (media) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [media, handleKeyDown]);

    if (!media) return null;

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Parse EXIF data (fallback for older entries)
    const exif = parseExifJson(media.exif_json);
    const exifValues = getExifDisplayValues(exif);
    const lens = media.lens_model || exifValues?.lens;
    const focalLength = media.focal_length || exifValues?.focalLength;
    const aperture = media.aperture || exifValues?.aperture;
    const shutter = media.shutter_speed || exifValues?.shutter;
    const iso = media.iso || exifValues?.iso;

    return (
        <div className={styles.overlay} onClick={onClose}>
            {/* Left sidebar with EXIF info */}
            <aside className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
                {/* Like button */}
                <div className={styles.likeSection}>
                    <LikeButton
                        likes={media.likes || 0}
                        liked={media.liked || false}
                        onToggle={handleLike}
                        size="large"
                    />
                </div>

                {/* Camera info */}
                {(media.camera_make || media.camera_model) && (
                    <div className={styles.sidebarSection}>
                        <h4 className={styles.sidebarTitle}>Camera</h4>
                        <p className={styles.sidebarValue}>
                            {media.camera_model?.trim() || media.camera_make}
                        </p>
                    </div>
                )}

                {lens && (
                    <div className={styles.sidebarSection}>
                        <h4 className={styles.sidebarTitle}>Lens</h4>
                        <p className={styles.sidebarValue}>{lens}</p>
                    </div>
                )}

                {/* EXIF info */}
                {(focalLength || aperture || shutter || iso) && (
                    <>
                        {focalLength && (
                            <div className={styles.sidebarSection}>
                                <h4 className={styles.sidebarTitle}>Focal Length</h4>
                                <p className={styles.sidebarValue}>{focalLength}</p>
                            </div>
                        )}
                        {aperture && (
                            <div className={styles.sidebarSection}>
                                <h4 className={styles.sidebarTitle}>Aperture</h4>
                                <p className={styles.sidebarValue}>{aperture}</p>
                            </div>
                        )}
                        {shutter && (
                            <div className={styles.sidebarSection}>
                                <h4 className={styles.sidebarTitle}>Shutter Speed</h4>
                                <p className={styles.sidebarValue}>{shutter}s</p>
                            </div>
                        )}
                        {iso && (
                            <div className={styles.sidebarSection}>
                                <h4 className={styles.sidebarTitle}>ISO</h4>
                                <p className={styles.sidebarValue}>{iso}</p>
                            </div>
                        )}
                    </>
                )}

                <div className={styles.sidebarSection}>
                    <h4 className={styles.sidebarTitle}>Size</h4>
                    <p className={styles.sidebarValue}>{media.size ? formatFileSize(media.size) : '-'}</p>
                </div>

                <div className={styles.sidebarSection}>
                    <h4 className={styles.sidebarTitle}>Date</h4>
                    <p className={styles.sidebarValue}>
                        {new Date(media.created_at).toLocaleDateString()}
                    </p>
                </div>

                {media.location_name && (
                    <div className={styles.sidebarSection}>
                        <h4 className={styles.sidebarTitle}>Location</h4>
                        <p className={styles.sidebarValue}>{media.location_name}</p>
                    </div>
                )}
            </aside>

            {/* Main content area */}
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                {/* Top toolbar with close and navigation buttons */}
                <div className={styles.toolbar}>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <div className={styles.navButtons}>
                        <button
                            className={`${styles.navBtn} ${!hasPrev ? styles.disabled : ''}`}
                            onClick={hasPrev ? onPrev : undefined}
                            aria-label="Previous"
                            disabled={!hasPrev}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <button
                            className={`${styles.navBtn} ${!hasNext ? styles.disabled : ''}`}
                            onClick={hasNext ? onNext : undefined}
                            aria-label="Next"
                            disabled={!hasNext}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className={styles.imageWrapper}>
                    <Image
                        src={media.url_large || media.url}
                        alt={media.alt || media.filename}
                        width={media.width || 1600}
                        height={media.height || 1200}
                        className={styles.image}
                        sizes="100vw"
                        unoptimized
                    />
                </div>
            </div>
        </div>
    );
}
