'use client';

import { useState, useCallback, Suspense, useEffect } from 'react';
import { Media } from '@/types/media';
import { likeMedia, unlikeMedia } from '@/lib/api';
import { useMediaList } from '@/hooks/useMediaList';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import MediaGrid from '@/components/MediaGrid';
import LightBox from '@/components/LightBox';
import { SITE_CONFIG } from '@/config/site';
import { t } from '@/lib/i18n';

interface Props {
    categorySlug: string;
    initialMedia?: Media[]; // Optional, keeping it for now if we want to use it later
}

function CategoryDetailContent({ categorySlug }: Props) {
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

    const {
        media,
        loading,
        error,
        page,
        setParams,
        updateMedia,
        hasMore,
        sort,
        orientation,
    } = useMediaList({ category: categorySlug, sort: 'date' });

    const handleSortChange = useCallback((newSort: 'date' | 'likes') => {
        setParams({ sort: newSort, page: 1 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [setParams]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            setParams({ page: page + 1 });
        }
    }, [loading, hasMore, page, setParams]);

    const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
        threshold: 0.1,
        enabled: hasMore && !loading
    });

    useEffect(() => {
        if (isIntersecting && hasMore && !loading) {
            loadMore();
        }
    }, [isIntersecting, hasMore, loading, loadMore]);

    const handleMediaClick = useCallback((item: Media) => {
        setSelectedMedia(item);
    }, []);

    const handleLightBoxClose = useCallback(() => {
        setSelectedMedia(null);
    }, []);

    const currentIndex = selectedMedia && media
        ? media.findIndex(m => m.id === selectedMedia.id)
        : -1;

    const handlePrev = useCallback(() => {
        if (media && currentIndex > 0) {
            setSelectedMedia(media[currentIndex - 1]);
        }
    }, [currentIndex, media]);

    const handleNext = useCallback(() => {
        if (media && currentIndex < media.length - 1) {
            setSelectedMedia(media[currentIndex + 1]);
        }
    }, [currentIndex, media]);

    const handleLike = useCallback(async (item: Media): Promise<{ likes: number; liked: boolean } | null> => {
        try {
            const result = item.liked
                ? await unlikeMedia(item.id)
                : await likeMedia(item.id);

            if (result.ok) {
                updateMedia(item.id, { likes: result.likes, liked: result.liked });

                if (selectedMedia && selectedMedia.id === item.id) {
                    setSelectedMedia(prev => prev ? { ...prev, likes: result.likes, liked: result.liked } : null);
                }

                return { likes: result.likes, liked: result.liked };
            }
            return null;
        } catch {
            return null;
        }
    }, [updateMedia, selectedMedia]);

    return (
        <>
            {error && (
                <div className="bg-destructive/15 border border-destructive rounded-lg p-4 mb-6">
                    <p className="text-destructive">{t('home_error')}</p>
                </div>
            )}

            {SITE_CONFIG.features.enableFilters && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4 mb-6">
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => handleSortChange('date')}
                            className={`flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-all ${sort === 'date'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('home_latest')}
                        </button>
                        <button
                            onClick={() => handleSortChange('likes')}
                            className={`flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-all ${sort === 'likes'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('home_popular')}
                        </button>
                    </div>

                    <div className="flex bg-muted p-1 rounded-lg overflow-x-auto max-w-full sm:max-w-none no-scrollbar">
                        <button
                            onClick={() => setParams({ orientation: undefined, page: 1 })}
                            className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!orientation
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('home_all')}
                        </button>
                        <button
                            onClick={() => setParams({ orientation: 'landscape', page: 1 })}
                            className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${orientation === 'landscape'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('home_landscape')}
                        </button>
                        <button
                            onClick={() => setParams({ orientation: 'portrait', page: 1 })}
                            className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${orientation === 'portrait'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('home_portrait')}
                        </button>
                        <button
                            onClick={() => setParams({ orientation: 'square', page: 1 })}
                            className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${orientation === 'square'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('home_square')}
                        </button>
                    </div>
                </div>
            )}

            <MediaGrid
                media={media || []}
                loading={loading && page === 1}
                onItemClick={handleMediaClick}
                onLike={SITE_CONFIG.features.enableLikes ? handleLike : undefined}
                masonry={true}
            />

            {/* Infinite Scroll Loading Sentinel */}
            <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-8 w-full" style={{ overflowAnchor: 'none' }}>
                {loading && page > 1 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{t('category_loading_more')}</span>
                    </div>
                )}
                {!hasMore && media.length > 0 && !loading && (
                    <p className="text-sm text-muted-foreground">No more photos to load</p>
                )}
            </div>

            <LightBox
                media={selectedMedia}
                onClose={handleLightBoxClose}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={currentIndex > 0}
                hasNext={media ? currentIndex < media.length - 1 : false}
                onLike={SITE_CONFIG.features.enableLikes ? handleLike : undefined}
            />
        </>
    );
}

export default function CategoryDetailClient(props: Props) {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <CategoryDetailContent {...props} />
        </Suspense>
    );
}
