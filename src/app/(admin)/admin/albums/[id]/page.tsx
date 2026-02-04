'use client';

import ConfirmDialog from '@/components/admin/ConfirmDialog';
import MediaPicker from '@/components/admin/MediaPicker';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    getAlbumById, updateAlbum, getAlbumMedia, addMediaToAlbum,
    removeMediaFromAlbum, generateAlbumOTP,
    type AlbumItem, type MediaItem,
} from '@/lib/admin/api';
import { Save, ArrowLeft, Plus, Trash2, Image as ImageIcon, Copy, Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from "sonner";
import { t } from '@/lib/i18n';

export default function AlbumDetailPage() {
    const params = useParams();
    const albumId = params.id as string;

    const [album, setAlbum] = useState<AlbumItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [slug, setSlug] = useState('');
    const [tags, setTags] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'draft' | 'published'>('published');
    const [coverMediaId, setCoverMediaId] = useState('');
    const [coverPreview, setCoverPreview] = useState<{ url: string; url_thumb?: string } | null>(null);

    // Album media state
    const [albumMedia, setAlbumMedia] = useState<MediaItem[]>([]);
    const [mediaPage, setMediaPage] = useState(1);
    const [mediaTotalPages, setMediaTotalPages] = useState(1);
    const [mediaTotal, setMediaTotal] = useState(0);
    const [mediaLoading, setMediaLoading] = useState(false);

    // Media picker state
    const [showPicker, setShowPicker] = useState(false);
    const [pickerSelectedIds, setPickerSelectedIds] = useState<string[]>([]);

    // Cover picker state
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const [coverPickerSelectedIds, setCoverPickerSelectedIds] = useState<string[]>([]);

    // Remove media confirm state
    const [removeMediaIds, setRemoveMediaIds] = useState<string[]>([]);

    // OTP state
    const [otp, setOtp] = useState('');
    const [generatingOtp, setGeneratingOtp] = useState(false);

    const loadAlbum = useCallback(async () => {
        if (!albumId) return;
        setLoading(true);
        try {
            const res = await getAlbumById(albumId);
            setAlbum(res.data);
            setTitle(res.data.title);
            setDescription(res.data.description || '');
            setSlug(res.data.slug || '');
            setTags(res.data.tags?.join(', ') || '');
            setPassword('');
            setStatus(res.data.status || 'published');
            setCoverMediaId(res.data.cover_media_id || '');
            if (res.data.cover_media) {
                setCoverPreview({ url: res.data.cover_media.url, url_thumb: res.data.cover_media.url_thumb });
            } else {
                setCoverPreview(null);
            }
        } catch (e) {
            console.error('Failed to load album:', e);
            toast.error(t('admin_album_detail_load_failed'));
        }
        setLoading(false);
    }, [albumId]);

    const loadAlbumMedia = useCallback(async (p: number) => {
        if (!albumId) return;
        setMediaLoading(true);
        try {
            const res = await getAlbumMedia(albumId, p, 24);
            setAlbumMedia(res.media);
            setMediaTotal(res.total);
            setMediaTotalPages(Math.ceil(res.total / 24));
            setMediaPage(p);
        } catch (e) {
            console.error('Failed to load album media:', e);
        }
        setMediaLoading(false);
    }, [albumId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadAlbum();
        loadAlbumMedia(1);
    }, [loadAlbum, loadAlbumMedia]);

    const handleSave = async () => {
        if (!albumId) return;
        setSaving(true);
        try {
            const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
            await updateAlbum(albumId, {
                title: title.trim(),
                description: description.trim() || undefined,
                slug: slug.trim() || undefined,
                tags: tagsArray.length > 0 ? tagsArray : [],
                password: password.trim() || undefined,
                status,
                cover_media_id: coverMediaId || undefined,
            });
            toast.success(t('admin_album_detail_save_success'));
            loadAlbum();
        } catch (e) {
            console.error('Failed to save album:', e);
            toast.error(t('admin_album_detail_save_failed'));
        }
        setSaving(false);
    };

    const handleAddMedia = async () => {
        if (!albumId || pickerSelectedIds.length === 0) return;
        try {
            await addMediaToAlbum(albumId, pickerSelectedIds);
            toast.success(t('admin_album_detail_add_success', { count: pickerSelectedIds.length }));
            setShowPicker(false);
            setPickerSelectedIds([]);
            loadAlbumMedia(1);
            loadAlbum();
        } catch (e) {
            console.error('Failed to add media:', e);
            toast.error(t('admin_album_detail_add_failed'));
        }
    };

    const handleRemoveMedia = async () => {
        if (!albumId || removeMediaIds.length === 0) return;
        try {
            await removeMediaFromAlbum(albumId, removeMediaIds);
            toast.success(t('admin_album_detail_remove_success'));
            setRemoveMediaIds([]);
            loadAlbumMedia(mediaPage);
            loadAlbum();
        } catch (e) {
            console.error('Failed to remove media:', e);
            toast.error(t('admin_album_detail_remove_failed'));
        }
    };

    const handleSelectCover = (ids: string[], items?: MediaItem[]) => {
        setCoverPickerSelectedIds(ids);
        if (ids.length > 0 && items && items.length > 0) {
            const item = items[0];
            setCoverMediaId(item.id);
            setCoverPreview({ url: item.url, url_thumb: item.url_thumb });
        }
    };

    const handleGenerateOtp = async () => {
        if (!albumId) return;
        setGeneratingOtp(true);
        try {
            const res = await generateAlbumOTP(albumId);
            setOtp(res.otp);
            toast.success(t('admin_album_detail_otp_generated'));
        } catch (e) {
            console.error('Failed to generate OTP:', e);
            toast.error(t('admin_album_detail_otp_failed'));
        }
        setGeneratingOtp(false);
    };

    const handleCopyOtp = () => {
        if (otp) {
            navigator.clipboard.writeText(otp);
            toast.success(t('common_copied'));
        }
    };

    if (loading) {
        return (
            <div className="text-center py-20 text-muted-foreground">{t('common_loading')}</div>
        );
    }

    if (!album) {
        return (
            <div className="text-center py-20">
                <p className="text-muted-foreground mb-4">{t('admin_album_detail_not_found')}</p>
                <Link href="/admin/albums">
                    <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-1" /> {t('admin_album_detail_back')}
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/albums">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">{t('admin_album_detail_title')}</h1>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? t('common_saving') : t('common_save')}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('admin_album_detail_basic')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>{t('admin_album_field_title')}</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)}
                                    placeholder={t('admin_album_field_title_placeholder')} className="mt-1" />
                            </div>
                            <div>
                                <Label>{t('admin_album_field_description')}</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('admin_album_field_description_placeholder')} rows={4} className="mt-1" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>{t('admin_album_field_slug')}</Label>
                                    <Input value={slug} onChange={(e) => setSlug(e.target.value)}
                                        placeholder={t('admin_album_field_slug_placeholder')} className="mt-1" />
                                </div>
                                <div>
                                    <Label>{t('admin_album_field_tags')}</Label>
                                    <Input value={tags} onChange={(e) => setTags(e.target.value)}
                                        placeholder={t('admin_album_field_tags_placeholder')} className="mt-1" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Album Photos */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{t('admin_album_detail_photos_title', { count: mediaTotal })}</CardTitle>
                                <Button size="sm" onClick={() => { setPickerSelectedIds([]); setShowPicker(true); }}>
                                    <Plus className="h-4 w-4 mr-1" /> {t('admin_album_detail_add_photos')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {mediaLoading && albumMedia.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">{t('common_loading')}</div>
                            ) : albumMedia.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">{t('admin_album_detail_no_photos')}</div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {albumMedia.map(item => (
                                        <div key={item.id} className="group relative aspect-square rounded-md overflow-hidden border bg-muted cursor-pointer">
                                            <Image
                                                src={item.url_thumb || item.url}
                                                alt={item.alt || ''}
                                                fill
                                                sizes="(max-width: 768px) 20vw, 10vw"
                                                className="object-cover"
                                                unoptimized
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Button size="icon" variant="ghost"
                                                    className="h-8 w-8 text-white hover:text-red-400 hover:bg-white/20"
                                                    onClick={() => setRemoveMediaIds([item.id])}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {coverMediaId === item.id && (
                                                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                                                    {t('admin_album_detail_cover_badge')}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {mediaTotalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-4">
                                    <Button variant="outline" size="sm" disabled={mediaPage <= 1}
                                        onClick={() => loadAlbumMedia(mediaPage - 1)}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm px-4">{mediaPage} / {mediaTotalPages}</span>
                                    <Button variant="outline" size="sm" disabled={mediaPage >= mediaTotalPages}
                                        onClick={() => loadAlbumMedia(mediaPage + 1)}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status & Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('admin_album_detail_settings')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>{t('admin_album_field_status')}</Label>
                                <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'published')}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="published">{t('common_published')}</SelectItem>
                                        <SelectItem value="draft">{t('common_draft')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('admin_album_field_password')}</Label>
                                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('admin_album_detail_password_hint')} className="mt-1" />
                                {album.is_protected && (
                                    <p className="text-xs text-muted-foreground mt-1">{t('admin_album_detail_password_enabled')}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cover Image */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('admin_album_detail_cover_title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {coverMediaId && coverPreview ? (
                                <div className="space-y-3">
                                    <div className="aspect-[4/3] rounded-md overflow-hidden border bg-muted relative">
                                        <Image
                                            src={coverPreview.url_thumb || coverPreview.url}
                                            alt=""
                                            fill
                                            sizes="320px"
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="flex-1"
                                            onClick={() => { setCoverPickerSelectedIds(coverMediaId ? [coverMediaId] : []); setShowCoverPicker(true); }}>
                                            {t('admin_album_detail_cover_change')}
                                        </Button>
                                        <Button size="sm" variant="ghost"
                                            onClick={() => { setCoverMediaId(''); setCoverPreview(null); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button variant="outline" className="w-full"
                                    onClick={() => { setCoverPickerSelectedIds([]); setShowCoverPicker(true); }}>
                                    <ImageIcon className="h-4 w-4 mr-1" /> {t('admin_album_detail_cover_select')}
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* OTP for protected albums */}
                    {album.is_protected && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('admin_album_detail_otp_title')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-xs text-muted-foreground">
                                    {t('admin_album_detail_otp_desc')}
                                </p>
                                <Button size="sm" onClick={handleGenerateOtp} disabled={generatingOtp} className="w-full">
                                    <Link2 className="h-4 w-4 mr-1" />
                                    {generatingOtp ? t('admin_album_detail_otp_generating') : t('admin_album_detail_otp_generate')}
                                </Button>
                                {otp && (
                                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                        <code className="text-xs flex-1 break-all">{otp}</code>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                                            onClick={handleCopyOtp}>
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Album Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('admin_album_detail_info')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <p>{t('admin_album_detail_info_id')}: {album.id}</p>
                            <p>{t('admin_album_detail_info_created')}: {new Date(album.created_at).toLocaleString()}</p>
                            <p>{t('admin_album_detail_info_updated')}: {new Date(album.updated_at).toLocaleString()}</p>
                            <p>{t('admin_album_detail_info_photos')}: {album.media_count}</p>
                            {album.views !== undefined && <p>{t('admin_album_detail_info_views')}: {album.views}</p>}
                            {album.likes !== undefined && <p>{t('admin_album_detail_info_likes')}: {album.likes}</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Media Picker for adding photos */}
            <MediaPicker
                open={showPicker}
                onOpenChange={(open) => {
                    if (!open && pickerSelectedIds.length > 0) {
                        handleAddMedia();
                    } else {
                        setShowPicker(open);
                    }
                }}
                selectedIds={pickerSelectedIds}
                onSelectionChange={(ids) => setPickerSelectedIds(ids)}
                multiple={true}
            />

            {/* Cover Picker */}
            <MediaPicker
                open={showCoverPicker}
                onOpenChange={(open) => {
                    setShowCoverPicker(open);
                }}
                selectedIds={coverPickerSelectedIds}
                onSelectionChange={handleSelectCover}
                multiple={false}
            />

            {/* Remove media confirm */}
            <ConfirmDialog
                open={removeMediaIds.length > 0}
                onOpenChange={(open) => { if (!open) setRemoveMediaIds([]); }}
                title={t('admin_album_detail_remove_title')}
                description={t('admin_album_detail_remove_desc')}
                onConfirm={handleRemoveMedia}
                confirmText={t('common_remove')}
                destructive
            />
        </div>
    );
}
