import { useWindowSize } from '@/hooks/useWindowSize';
import { Media } from '@/types/media';
import MediaCard from './MediaCard';
import styles from './MediaGrid.module.scss';
import { SITE_CONFIG } from '@/config/site';
import { useMemo, type CSSProperties } from 'react';

interface MediaGridProps {
    media: Media[];
    onItemClick?: (media: Media) => void;
    onLike?: (media: Media) => Promise<{ likes: number; liked: boolean } | null>;
    loading?: boolean;
    columns?: number; // Allow specifying column count override
    masonry?: boolean; // Now triggers JS masonry
}

export default function MediaGrid({ media, onItemClick, onLike, loading, columns: explicitColumns, masonry }: MediaGridProps) {
    const { width } = useWindowSize();
    const gapStyle: CSSProperties = {
        '--media-gap': SITE_CONFIG.mediaGap?.desktop ?? '1rem',
        '--media-gap-mobile': SITE_CONFIG.mediaGap?.mobile ?? '0.75rem',
    } as CSSProperties;

    // Determine column count based on window width
    // specific to client-side rendering after hydration
    const { default: defaultCols, sm, md, lg } = SITE_CONFIG.masonryColumns;
    let responsiveColumns = defaultCols;

    if (width) {
        if (width < 640) {
            responsiveColumns = sm;
        } else if (width < 960) {
            responsiveColumns = md;
        } else if (width < 1280) {
            responsiveColumns = lg;
        }
    }

    const activeColumnCount = explicitColumns
        ? Math.min(explicitColumns, responsiveColumns)
        : responsiveColumns;

    // Distribute media into columns
    const columns = useMemo(() => {
        if (!masonry) {
            return []; // Not used in grid mode
        }

        const cols: Media[][] = Array.from({ length: activeColumnCount }, () => []);
        const colHeights = new Array(activeColumnCount).fill(0);

        media.forEach((item) => {
            // Find the shortest column
            // We use aspect ratio as a proxy for height. 
            // Default to square (1) if dimensions missing.
            const aspectRatio = (item.width && item.height)
                ? item.height / item.width
                : 1;

            // In a real masonry, we add the rendered height. 
            // Here we just accumulate the aspect ratio units.
            let minHeight = colHeights[0];
            let minIndex = 0;

            for (let i = 1; i < activeColumnCount; i++) {
                if (colHeights[i] < minHeight) {
                    minHeight = colHeights[i];
                    minIndex = i;
                }
            }

            cols[minIndex].push(item);
            colHeights[minIndex] += aspectRatio;
        });

        return cols;
    }, [media, activeColumnCount, masonry]);


    if (loading) {
        return (
            <div className={styles.grid} style={gapStyle}>
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className={styles.skeleton}>
                        <div className={styles.skeletonImage} />
                        <div className={styles.skeletonInfo}>
                            <div className={styles.skeletonText} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (media.length === 0) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyIcon}>📷</div>
                <h3 className={styles.emptyTitle}>No photos found</h3>
                <p className={styles.emptyText}>Try adjusting your search or filters</p>
            </div>
        );
    }

    // JS Masonry Layout
    if (masonry) {
        return (
            <div className={styles.masonryContainer} style={gapStyle}>
                {columns.map((colItems, colIndex) => (
                    <div key={colIndex} className={styles.masonryColumn}>
                        {colItems.map((item) => (
                            <div key={item.id} className={styles.masonryItem}>
                                <MediaCard
                                    media={item}
                                    onClick={onItemClick}
                                    onLike={onLike}
                                    aspectRatio="auto"
                                    className={styles.cardOverride}
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    // Default CSS Grid Layout (Square crops)
    const gridClassName = `${styles.grid} ${explicitColumns === 3 ? styles.cols3 : ''}`;
    return (
        <div className={gridClassName} style={gapStyle}>
            {media.map((item) => (
                <div key={item.id}>
                    <MediaCard
                        media={item}
                        onClick={onItemClick}
                        onLike={onLike}
                        aspectRatio="square"
                    />
                </div>
            ))}
        </div>
    );
}
