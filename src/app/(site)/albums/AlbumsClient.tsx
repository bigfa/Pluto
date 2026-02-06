'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Album, AlbumListResponse } from '@/types/album';
import { fetchAlbums } from '@/lib/api';
import { checkAuth } from '@/lib/admin/api';
import AlbumCard from '@/components/AlbumCard';
import AlbumCategoryTabs from '@/components/AlbumCategoryTabs';
import Pagination from '@/components/Pagination';
import styles from './page.module.scss';
import Link from 'next/link';
import RssIcon from '@/components/RssIcon';
import { t } from '@/lib/i18n';
import { useSearchParams } from 'next/navigation';

interface AlbumsClientProps {
    initialAlbums?: Album[];
    initialTotal?: number;
    initialPage?: number;
    initialPageSize?: number;
    initialLoaded?: boolean;
    initialCategory?: string | null;
}

export default function AlbumsClient({
    initialAlbums = [],
    initialTotal = 0,
    initialPage = 1,
    initialPageSize = 20,
    initialLoaded = false,
    initialCategory = null,
}: AlbumsClientProps) {
    const searchParams = useSearchParams();
    const categoryFromUrl = searchParams.get('category');
    // const router = useRouter(); // Removed unused router
    const [albums, setAlbums] = useState<Album[]>(initialAlbums);
    const [loading, setLoading] = useState(!initialLoaded);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(initialPage);
    const [total, setTotal] = useState(initialTotal);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? categoryFromUrl);
    const pageSize = initialPageSize;
    const skipInitialRef = useRef(initialLoaded);

    const loadAlbums = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response: AlbumListResponse = await fetchAlbums({ page, pageSize, category: selectedCategory || undefined });
            if (response.ok) {
                setAlbums(response.albums || []);
                setTotal(response.total || 0);
            } else {
                setError(t('albums_fetch_error'));
            }
        } catch (err) {
            console.error('Failed to load albums:', err);
            setError(t('albums_error'));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, selectedCategory]);

    useEffect(() => {
        if (skipInitialRef.current) {
            skipInitialRef.current = false;
            return;
        }
        loadAlbums();
    }, [loadAlbums]);

    useEffect(() => {
        checkAuth()
            .then((res) => setIsAdmin(!!res?.user))
            .catch(() => setIsAdmin(false));
    }, []);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCategoryChange = (category: string | null) => {
        setSelectedCategory(category);
        setPage(1);
        const url = new URL(window.location.href);
        if (category) {
            url.searchParams.set('category', category);
        } else {
            url.searchParams.delete('category');
        }
        window.history.pushState({}, '', url);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className={styles['albums-page']}>

            {error && (
                <div className={styles['albums-page__error']}>
                    <p>{error}</p>
                </div>
            )}

            <div className="mb-6">
                <AlbumCategoryTabs
                    selectedCategory={selectedCategory}
                    onCategoryChange={handleCategoryChange}
                />
            </div>

            {loading ? (
                <div className={styles['albums-page__grid']}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={styles['albums-page__skeleton-card']}>
                            <div className={styles['albums-page__skeleton-cover']}></div>
                            <div className={styles['albums-page__skeleton-info']}>
                                <div className={`${styles['albums-page__skeleton-text']} ${styles['albums-page__skeleton-text--title']}`}></div>
                                <div className={`${styles['albums-page__skeleton-text']} ${styles['albums-page__skeleton-text--desc']}`}></div>
                                <div className={`${styles['albums-page__skeleton-text']} ${styles['albums-page__skeleton-text--desc-short']}`}></div>
                                <div className={`${styles['albums-page__skeleton-text']} ${styles['albums-page__skeleton-text--date']}`}></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className={styles['albums-page__grid']}>
                        {albums.map(album => (
                            <AlbumCard
                                key={album.id}
                                album={album}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                    {albums.length === 0 && !error && (
                        <div className={styles['albums-page__empty']}>
                            <p>{t('albums_empty')}</p>
                        </div>
                    )}
                </>
            )}

            {!loading && albums.length > 0 && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    );
}
