import { Media, parseExifJson, getExifDisplayValues } from '@/types/media';
import LikeButton from './LikeButton';
import LazyImage from './LazyImage';
import styles from './MediaCard.module.scss';
import { useCallback, useState } from 'react';

interface MediaCardProps {
    media: Media;
    onClick?: (media: Media) => void;
    onLike?: (media: Media) => Promise<{ likes: number; liked: boolean } | null>;
    aspectRatio?: 'square' | 'auto';
    className?: string; // Add className prop for external styling
}

export default function MediaCard({ media, onClick, onLike, aspectRatio = 'square', className }: MediaCardProps) {
    const [dynamicAspectRatio, setDynamicAspectRatio] = useState<string | null>(null);
    const handleClick = () => {
        if (onClick) {
            onClick(media);
        }
    };

    const handleLike = async () => {
        if (onLike) {
            return onLike(media);
        }
        return null;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Parse EXIF data (fallback for older entries)
    const exif = parseExifJson(media.exif_json);
    const exifValues = getExifDisplayValues(exif);
    const aperture = media.aperture || exifValues?.aperture;
    const shutter = media.shutter_speed || exifValues?.shutter;
    const iso = media.iso || exifValues?.iso;
    const focalLength = media.focal_length || exifValues?.focalLength;

    const exifRecord = (exif as Record<string, unknown>) || null;
    const normalizeNumber = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
        if (typeof value === 'string') {
            const match = value.match(/[0-9]+(?:\.[0-9]+)?/);
            if (match) {
                const parsed = Number(match[0]);
                return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
            }
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                const parsed = normalizeNumber(item);
                if (parsed) return parsed;
            }
        }
        return null;
    };

    const readExifNumber = (keys: string[]): number | null => {
        if (!exifRecord) return null;
        for (const key of keys) {
            const entry = exifRecord[key];
            if (!entry) continue;
            if (typeof entry === 'object' && entry !== null) {
                const value = (entry as { value?: unknown; description?: unknown }).value;
                const description = (entry as { value?: unknown; description?: unknown }).description;
                const parsedValue = normalizeNumber(value) ?? normalizeNumber(description);
                if (parsedValue) return parsedValue;
            } else {
                const parsedValue = normalizeNumber(entry);
                if (parsedValue) return parsedValue;
            }
        }
        return null;
    };

    const readNestedExifNumber = (keys: string[]): number | null => {
        if (!exifRecord) return null;
        const groups = ['file', 'exif', 'ifd0'];
        for (const group of groups) {
            const entry = exifRecord[group];
            if (!entry || typeof entry !== 'object') continue;
            const groupRecord = entry as Record<string, unknown>;
            for (const key of keys) {
                const value = groupRecord[key];
                if (!value) continue;
                const parsed = normalizeNumber(value);
                if (parsed) return parsed;
            }
        }
        return null;
    };

    const resolvedWidth = normalizeNumber(media.width)
        ?? readExifNumber(['Image Width', 'ImageWidth', 'PixelXDimension', 'ExifImageWidth'])
        ?? readNestedExifNumber(['Image Width', 'ImageWidth', 'PixelXDimension', 'ExifImageWidth']);
    const resolvedHeight = normalizeNumber(media.height)
        ?? readExifNumber(['Image Height', 'ImageLength', 'PixelYDimension', 'ExifImageHeight'])
        ?? readNestedExifNumber(['Image Height', 'ImageLength', 'PixelYDimension', 'ExifImageHeight']);

    const resolvedAspectRatio = aspectRatio === 'auto' && resolvedWidth && resolvedHeight
        ? `${resolvedWidth} / ${resolvedHeight}`
        : undefined;
    const finalAspectRatio = resolvedAspectRatio || dynamicAspectRatio || undefined;

    const handleLoadSize = useCallback((size: { width: number; height: number }) => {
        if (aspectRatio !== 'auto' || resolvedAspectRatio || dynamicAspectRatio) return;
        if (size.width > 0 && size.height > 0) {
            setDynamicAspectRatio(`${size.width} / ${size.height}`);
        }
    }, [aspectRatio, resolvedAspectRatio, dynamicAspectRatio]);

    return (
        <div className={`${styles.card} ${className || ''}`} onClick={handleClick}>
            <div
                className={`${styles.imageWrapper} ${aspectRatio === 'auto' ? styles.autoAspect : ''}`}
                style={finalAspectRatio ? { aspectRatio: finalAspectRatio } : undefined}
            >
                <LazyImage
                    src={media.url_medium || media.url}
                    alt={media.alt || media.filename}
                    className={styles.image}
                    onLoadSize={handleLoadSize}
                />
                <div className={styles.overlay}>
                    <div className={styles.overlayContent}>
                        <div className={styles.meta}>
                            {media.camera_model && (
                                <span className={styles.camera}>{media.camera_model.trim()}</span>
                            )}
                        </div>
                        {(aperture || shutter || iso || focalLength) && (
                            <div className={styles.exif}>
                                {aperture && <span>{aperture}</span>}
                                {shutter && <span>{shutter}s</span>}
                                {iso && <span>ISO {iso}</span>}
                                {focalLength && <span>{focalLength}</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className={styles.info}>
                <div className={styles.infoLeft}>
                    <span className={styles.date}>{formatDate(media.created_at)}</span>
                    {media.location_name && (
                        <span className={styles.location}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            {media.location_name}
                        </span>
                    )}
                </div>
                <div className={styles.infoRight}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <LikeButton
                            likes={media.likes || 0}
                            liked={media.liked || false}
                            onToggle={handleLike}
                            size="small"
                        />
                    </div>
                </div>
            </div>
            {((media.categories && media.categories.length > 0) || (media.tags && media.tags.length > 0)) && (
                <div className={styles.tagsRow}>
                    {media.categories?.map((category) => (
                        <span key={category.id} className={styles.categoryBadge}>
                            {category.name}
                        </span>
                    ))}
                    {media.tags?.map((tag) => (
                        <span key={tag} className={styles.tagBadge}>
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
