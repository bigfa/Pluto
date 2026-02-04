'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Album } from '@/types/album';
import { Media } from '@/types/media';
import { fetchAlbum, fetchAlbumMedia, likeMedia, unlikeMedia, getAlbumLikeInfo, likeAlbum, unlikeAlbum, recordAlbumView, unlockAlbum } from '@/lib/api';
import MediaGrid from '@/components/MediaGrid';
import Pagination from '@/components/Pagination';
import LightBox from '@/components/LightBox';
import AlbumComments from '@/components/AlbumComments';
import LikeButton from '@/components/LikeButton';
import styles from './page.module.scss';
import { Lock } from 'lucide-react';

interface AlbumDetailClientProps {
    id: string;
}

export default function AlbumDetailClient({ id }: AlbumDetailClientProps) {
    const router = useRouter();

    const [album, setAlbum] = useState<Album | null>(null);
    const [media, setMedia] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [mediaLoading, setMediaLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

    // Album like state
    const [albumLikes, setAlbumLikes] = useState(0);
    const [isAlbumLiked, setIsAlbumLiked] = useState(false);
    const [albumViews, setAlbumViews] = useState(0);

    // Password Protection State
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const unlockFormRef = useRef<HTMLFormElement>(null);

    const pageSize = 50;

    const loadAlbumPhotos = useCallback(async (token?: string) => {
        if (!album) return;
        setMediaLoading(true);
        try {
            // Use provided token or fall back to stored one
            const authToken = token || sessionStorage.getItem(`album_token_${album.id}`) || undefined;
            const response = await fetchAlbumMedia(album.id, { page, pageSize, token: authToken });
            if (response.ok) {
                setMedia(response.media || []);
                setTotal(response.total || 0);
            }
        } catch (err) {
            console.error('Failed to load album photos:', err);
        } finally {
            setMediaLoading(false);
        }
    }, [album, page]);

    useEffect(() => {
        async function loadAlbumDetails() {
            try {
                const token = sessionStorage.getItem(`album_token_${id}`);
                const response = await fetchAlbum(id, token || undefined);

                if (response.ok) {
                    const albumData = response.data;
                    setAlbum(albumData);
                    if (token) {
                        sessionStorage.setItem(`album_token_${albumData.id}`, token);
                        if (albumData.slug) {
                            sessionStorage.setItem(`album_token_${albumData.slug}`, token);
                        }
                    }
                    if (albumData.views) setAlbumViews(albumData.views);

                    recordAlbumView(albumData.id).then(res => {
                        if (res.ok) setAlbumViews(res.views);
                    });

                    try {
                        const likeInfo = await getAlbumLikeInfo(albumData.id);
                        if (likeInfo.ok) {
                            setAlbumLikes(likeInfo.likes);
                            setIsAlbumLiked(likeInfo.liked);
                        }
                    } catch (e) {
                        console.error('Failed to fetch album like info', e);
                    }
                } else {
                    setError('Failed to fetch album details');
                }
            } catch (error: unknown) {
                const err = error as { status?: number; code?: string; data?: Album };
                if (err.status === 403 && (err.code === 'PASSWORD_REQUIRED' || err.code === 'ALBUM_PROTECTED')) {
                    setShowPasswordPrompt(true);
                    if (err.data) {
                        setAlbum(err.data);
                    }
                } else {
                    console.error('Failed to load album:', err);
                    setError('Failed to load album details');
                }
            } finally {
                setLoading(false);
            }
        }
        loadAlbumDetails();
    }, [id]);

    useEffect(() => {
        if (album && !showPasswordPrompt) {
            loadAlbumPhotos();
        }
    }, [loadAlbumPhotos, album, showPasswordPrompt]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setUnlocking(true);
        setPasswordError('');

        try {
            const res = await unlockAlbum(id, password);
            if (res.ok) {
                sessionStorage.setItem(`album_token_${id}`, res.token);
                setShowPasswordPrompt(false);

                // Reload details with token to get full data if needed (though we might already have it or just need media)
                // But fetchAlbum might return more data for unlocked album
                const response = await fetchAlbum(id, res.token);
                if (response.ok) {
                    setAlbum(response.data);
                    sessionStorage.setItem(`album_token_${response.data.id}`, res.token);
                    if (response.data.slug) {
                        sessionStorage.setItem(`album_token_${response.data.slug}`, res.token);
                    }
                }
            }
        } catch {
            setPasswordError('Incorrect password');
        } finally {
            setUnlocking(false);
        }
    };

    const handleAlbumLike = useCallback(async (): Promise<{ likes: number; liked: boolean } | null> => {
        if (!album) return null;
        try {
            const result = isAlbumLiked
                ? await unlikeAlbum(album.id)
                : await likeAlbum(album.id);

            if (result.ok) {
                setAlbumLikes(result.likes);
                setIsAlbumLiked(result.liked);
                return { likes: result.likes, liked: result.liked };
            }
            return null;
        } catch {
            return null;
        }
    }, [album, isAlbumLiked]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
                setMedia(prev => prev.map(m =>
                    m.id === item.id ? { ...m, likes: result.likes, liked: result.liked } : m
                ));

                if (selectedMedia && selectedMedia.id === item.id) {
                    setSelectedMedia(prev => prev ? { ...prev, likes: result.likes, liked: result.liked } : null);
                }

                return { likes: result.likes, liked: result.liked };
            }
            return null;
        } catch {
            return null;
        }
    }, [selectedMedia]);

    if (loading) {
        return <div className={styles['album-detail__loading']}>Loading album...</div>;
    }

    if (showPasswordPrompt) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
                <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-lg border border-border">
                    <div className="flex flex-col items-center mb-6 text-center">
                        <div className="bg-muted p-3 rounded-full mb-4">
                            <Lock className="w-8 h-8 text-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Password Protected</h2>
                        <p className="text-muted-foreground">
                            This album is password protected. Please enter the password to view its contents.
                        </p>
                    </div>

                    <form ref={unlockFormRef} onSubmit={handleUnlock} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
                                autoFocus
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        unlockFormRef.current?.requestSubmit();
                                    }
                                }}
                            />
                            {passwordError && (
                                <p className="text-red-500 text-sm mt-2 font-medium">{passwordError}</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={unlocking || !password}
                            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {unlocking ? 'Unlocking...' : 'Unlock Album'}
                        </button>
                    </form>

                    <button
                        onClick={() => router.back()}
                        className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        &larr; Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (error || !album) {
        return (
            <div className={styles['album-detail__error']}>
                <p>{error || 'Album not found'}</p>
                <div className={styles['album-detail__back-button-wrapper']}>
                    <button onClick={() => router.back()} className={styles['album-detail__back-button']}>
                        &larr; Back to Albums
                    </button>
                </div>
            </div>
        );
    }

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className={styles['album-detail']}>
            <div className={styles['album-detail__header']}>
                <button onClick={() => router.push('/albums')} className={styles['album-detail__back-link']}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Albums
                </button>
                <div className={styles['album-detail__header-content']}>
                    <h1 className={styles['album-detail__title']}>
                        {album.title}
                        {album.is_protected && <Lock className="inline-block ml-2 w-5 h-5 text-muted-foreground" />}
                    </h1>
                    <div className={styles['album-detail__meta']}>
                        <span className={styles['album-detail__meta-item']}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            {album.media_count} photos
                        </span>
                        <span className={styles['album-detail__meta-divider']}>•</span>
                        <span className={styles['album-detail__meta-item']}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {new Date(album.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className={styles['album-detail__meta-divider']}>•</span>
                        <span className={styles['album-detail__meta-item']}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            {albumViews} views
                        </span>
                        <span className={styles['album-detail__meta-divider']}>•</span>
                        <div onClick={(e) => e.stopPropagation()}>
                            <LikeButton
                                likes={albumLikes}
                                liked={isAlbumLiked}
                                onToggle={handleAlbumLike}
                                size="medium"
                            />
                        </div>
                    </div>
                    {album.description && <p className={styles['album-detail__description']}>{album.description}</p>}
                </div>
            </div>

            <MediaGrid
                media={media}
                loading={mediaLoading}
                onItemClick={handleMediaClick}
                onLike={handleLike}
                columns={3}
                masonry={true}
            />

            {!mediaLoading && media.length > 0 && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            <LightBox
                media={selectedMedia}
                onClose={handleLightBoxClose}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={currentIndex > 0}
                hasNext={media ? currentIndex < media.length - 1 : false}
                onLike={handleLike}
            />

            {album && <AlbumComments albumId={album.id} />}
        </div>
    );
}
