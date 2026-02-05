'use client';

import { Album } from '@/types/album';
import { Lock, LockOpen } from 'lucide-react';
import styles from './AlbumCard.module.scss';
import Link from 'next/link';
import LazyImage from './LazyImage';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { unlockAlbum } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AlbumCardProps {
    album: Album;
    onClick?: (album: Album) => void;
    isAdmin?: boolean;
}

export default function AlbumCard({ album, isAdmin = false }: AlbumCardProps) {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (!album.is_protected) return;
        const token = sessionStorage.getItem(`album_token_${album.id}`)
            || (album.slug ? sessionStorage.getItem(`album_token_${album.slug}`) : null);
        setIsUnlocked(!!token);
    }, [album.id, album.slug, album.is_protected]);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const albumHref = `/albums/${album.slug || album.id}`;

    const handleCardClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (album.is_protected && !isUnlocked && !isAdmin) {
            event.preventDefault();
            setShowPasswordPrompt(true);
        }
    };

    const handleUnlock = async (event: React.FormEvent) => {
        event.preventDefault();
        setUnlocking(true);
        setPasswordError('');

        try {
            const result = await unlockAlbum(album.id, password);
            if (result.ok) {
                sessionStorage.setItem(`album_token_${album.id}`, result.token);
                if (album.slug) {
                    sessionStorage.setItem(`album_token_${album.slug}`, result.token);
                }
                setIsUnlocked(true);
                setShowPasswordPrompt(false);
                setPassword('');
                router.push(albumHref);
                return;
            }
            setPasswordError('密码不正确');
        } catch {
            setPasswordError('密码不正确');
        } finally {
            setUnlocking(false);
        }
    };

    return (
        <>
            <Link href={albumHref} className={styles['album-card']} onClick={handleCardClick}>
            <div className={styles['album-card__cover-wrapper']}>
                {album.cover_media ? (
                    <LazyImage
                        src={album.cover_media.url_medium || album.cover_media.url}
                        alt={album.title}
                        className={styles['album-card__cover-image']}
                    />
                ) : (
                    <div className={styles['album-card__placeholder-cover']}>
                        <svg
                            className={styles['album-card__folder-icon']}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                )}
                {album.is_protected && (
                    <div className="absolute top-2 right-2 z-10 text-white/80 bg-black/40 p-1 rounded-md backdrop-blur-sm">
                        {isUnlocked ? <LockOpen size={16} /> : <Lock size={16} />}
                    </div>
                )}
                <div className={styles['album-card__overlay']}>
                    <div className={styles['album-card__stats']}>
                        <span className={styles['album-card__count']}>
                            <svg className={styles['album-card__icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            {album.views || 0}
                        </span>
                        <span className={styles['album-card__count']}>
                            <svg className={styles['album-card__icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {album.likes || 0}
                        </span>
                        <span className={styles['album-card__count']}>
                            <svg className={styles['album-card__icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            {album.media_count}
                        </span>
                    </div>
                </div>
            </div>
            <div className={styles['album-card__info']}>
                <h3 className={styles['album-card__title']}>{album.title}</h3>
                <p className={styles['album-card__description']}>{album.description}</p>
                {album.categories && album.categories.length > 0 && (
                    <div className={styles['album-card__categories']}>
                        {album.categories.map((category) => (
                            <span key={category.id} className={styles['album-card__category']}>
                                {category.name}
                            </span>
                        ))}
                    </div>
                )}
                <span className={styles['album-card__date']}>{formatDate(album.created_at)}</span>
            </div>
            </Link>

            <Dialog
                open={showPasswordPrompt}
                onOpenChange={(open) => {
                    setShowPasswordPrompt(open);
                    if (!open) {
                        setPassword('');
                        setPasswordError('');
                    }
                }}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>请输入相册密码</DialogTitle>
                    </DialogHeader>
                    <form ref={formRef} onSubmit={handleUnlock} className="space-y-4">
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="输入密码"
                            autoFocus
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    formRef.current?.requestSubmit();
                                }
                            }}
                        />
                        {passwordError && (
                            <p className="text-sm text-destructive">{passwordError}</p>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowPasswordPrompt(false)}>
                                取消
                            </Button>
                            <Button type="submit" disabled={!password || unlocking}>
                                {unlocking ? '解锁中...' : '确认'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
