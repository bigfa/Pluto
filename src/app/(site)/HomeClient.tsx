'use client';

import { useState, useCallback, Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Media } from '@/types/media';
import { likeMedia, unlikeMedia } from '@/lib/api';
import { useMediaList } from '@/hooks/useMediaList';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import MediaGrid from '@/components/MediaGrid';
import LightBox from '@/components/LightBox';
import CategoryTabs from '@/components/CategoryTabs';
import { SITE_CONFIG } from '@/config/site';
import { t } from '@/lib/i18n';

interface HomeClientProps {
    initialMedia?: Media[];
    initialTotal?: number;
    initialPage?: number;
    initialPageSize?: number;
    initialCategory?: string | null;
    initialLoaded?: boolean;
}

function HomeContent({
    initialMedia = [],
    initialTotal = 0,
    initialPage = 1,
    initialPageSize = SITE_CONFIG.pageSize,
    initialCategory = null,
    initialLoaded = false,
}: HomeClientProps) {
    const searchParams = useSearchParams();
    const categoryFromUrl = searchParams.get('category');

    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? categoryFromUrl);

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
    } = useMediaList(
        { category: selectedCategory || undefined, sort: 'date', page: initialPage, pageSize: initialPageSize },
        initialLoaded
            ? { media: initialMedia, total: initialTotal, page: initialPage, pageSize: initialPageSize, sort: 'date' }
            : undefined,
    );

    const handleCategoryChange = useCallback((category: string | null) => {
        setSelectedCategory(category);
        setParams({ category: category || undefined, page: 1 });

        // Update URL
        const url = new URL(window.location.href);
        if (category) {
            url.searchParams.set('category', category);
        } else {
            url.searchParams.delete('category');
        }
        window.history.pushState({}, '', url);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [setParams]);

    const handleSortChange = useCallback((newSort: 'date' | 'likes') => {
        // Optimistic check? No, sort comes from useMediaList which updates via setParams
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

    const locale = SITE_CONFIG.i18n.defaultLocale || 'en';

        const groupedMedia = useMemo(() => {
            const groups = new Map<string, { label: string; items: Media[] }>();

            const parseMediaDate = (value?: string | null) => {
                if (!value) return null;
                // Handle EXIF format: YYYY:MM:DD HH:MM:SS
                if (/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
                    const [datePart, timePart] = value.split(' ');
                    const [y, m, d] = datePart.split(':');
                    return new Date(`${y}-${m}-${d}T${timePart}Z`);
                }
                const parsed = new Date(value);
                return Number.isNaN(parsed.getTime()) ? null : parsed;
            };

            for (const item of media || []) {
                const rawDate = item.datetime_original || item.created_at;
                const date = parseMediaDate(rawDate);
                const currentYear = new Date().getFullYear();
                const key = date && !Number.isNaN(date.getTime())
                    ? date.toISOString().slice(0, 10)
                    : 'unknown';
                const label = date && !Number.isNaN(date.getTime())
                    ? new Intl.DateTimeFormat(locale, date.getFullYear() === currentYear
                        ? { month: 'short', day: '2-digit' }
                        : { month: 'short', day: '2-digit', year: 'numeric' }
                    ).format(date)
                    : t('unknown_date');

            if (!groups.has(key)) {
                groups.set(key, { label, items: [] });
            }
            groups.get(key)!.items.push(item);
        }

        return Array.from(groups.values());
    }, [media, locale]);

    return (
        <div className="min-h-screen">
            {error && (
                <div className="bg-destructive/15 border border-destructive rounded-lg p-4 mb-6 max-w-7xl mx-auto mt-8">
                    <p className="text-destructive">{t('home_error')}</p>
                </div>
            )}

            <section className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                        <h2 className="text-3xl font-bold tracking-tight">{t('home_title')}</h2>

                        {SITE_CONFIG.features.enableFilters && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
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
                    </div>

                    {SITE_CONFIG.features.enableFilters && (
                        <div className="mb-6">
                            <CategoryTabs
                                selectedCategory={selectedCategory}
                                onCategoryChange={handleCategoryChange}
                            />
                        </div>
                    )}

                    {loading && page === 1 && (media?.length ?? 0) === 0 ? (
                        <MediaGrid
                            media={[]}
                            loading={true}
                            onItemClick={handleMediaClick}
                            onLike={SITE_CONFIG.features.enableLikes ? handleLike : undefined}
                            masonry={true}
                        />
                    ) : (
                        groupedMedia.map((group, index) => (
                            <div key={`${group.label}-${index}`} className="mb-10">
                                <div className="text-[1.25rem] font-medium text-foreground/90 mb-4">
                                    {group.label}
                                </div>
                                <MediaGrid
                                    media={group.items}
                                    loading={false}
                                    onItemClick={handleMediaClick}
                                    onLike={SITE_CONFIG.features.enableLikes ? handleLike : undefined}
                                    masonry={true}
                                />
                            </div>
                        ))
                    )}

                    {/* Infinite Scroll Loading Sentinel */}
                    <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-8 w-full" style={{ overflowAnchor: 'none' }}>
                        {loading && page > 1 && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>{t('home_loading_more')}</span>
                            </div>
                        )}
                        {!hasMore && media.length > 0 && !loading && (
                            <p className="text-sm text-muted-foreground">{t('home_no_more')}</p>
                        )}
                    </div>
                </div>
            </section>

            <LightBox
                media={selectedMedia}
                onClose={handleLightBoxClose}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={currentIndex > 0}
                hasNext={media ? currentIndex < media.length - 1 : false}
                onLike={SITE_CONFIG.features.enableLikes ? handleLike : undefined}
            />
        </div>
    );
}

export default function HomeClient(props: HomeClientProps) {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <HomeContent {...props} />
        </Suspense>
    );
}
