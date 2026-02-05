'use client';

import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    listAlbums, createAlbum, deleteAlbum as deleteAlbumApi,
    listAlbumCategories, type AlbumItem, type AlbumCategory,
} from '@/lib/admin/api';
import { Plus, Trash2, Edit, ChevronLeft, ChevronRight, Lock, Image as ImageIcon } from 'lucide-react';
import { toast } from "sonner";
import { t } from '@/lib/i18n';
import { MultiSelect } from '@/components/ui/multi-select';
import AlbumCategoryManager from '@/components/admin/albums/AlbumCategoryManager';

export default function AlbumsPage() {
    const [albums, setAlbums] = useState<AlbumItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Create dialog state
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [newTags, setNewTags] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newStatus, setNewStatus] = useState<'draft' | 'published'>('published');
    const [creating, setCreating] = useState(false);
    const [categories, setCategories] = useState<AlbumCategory[]>([]);
    const [newCategoryIds, setNewCategoryIds] = useState<string[]>([]);

    // Delete confirm state
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const loadAlbums = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await listAlbums(p, search);
            setAlbums(res.albums);
            setTotalPages(res.totalPages);
            setTotal(res.total);
            setPage(p);
        } catch (e) {
            console.error('Failed to load albums:', e);
            toast.error(t('admin_albums_load_failed'));
        }
        setLoading(false);
    }, [search]);

    const loadCategories = useCallback(async () => {
        try {
            const res = await listAlbumCategories();
            setCategories(res.categories || []);
        } catch (e) {
            console.error('Failed to load album categories:', e);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadAlbums(1);
        loadCategories();
    }, [loadAlbums, loadCategories]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadAlbums(1);
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
            await createAlbum({
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
                slug: newSlug.trim() || undefined,
                tags: tagsArray.length > 0 ? tagsArray : undefined,
                password: newPassword.trim() || undefined,
                status: newStatus,
                category_ids: newCategoryIds,
            });
            toast.success(t('admin_albums_create_success'));
            setShowCreate(false);
            setNewTitle('');
            setNewDescription('');
            setNewSlug('');
            setNewTags('');
            setNewPassword('');
            setNewStatus('published');
            setNewCategoryIds([]);
            loadAlbums(1);
        } catch (e) {
            console.error('Failed to create album:', e);
            toast.error(t('admin_albums_create_failed'));
        }
        setCreating(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteAlbumApi(deleteId);
            toast.success(t('admin_albums_delete_success'));
            setDeleteId(null);
            loadAlbums(page);
        } catch (e) {
            console.error('Failed to delete album:', e);
            toast.error(t('admin_albums_delete_failed'));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('admin_albums_title')}</h1>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-1" /> {t('admin_albums_create')}
                </Button>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <Input
                            placeholder={t('admin_albums_search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit">{t('common_search')}</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Info */}
            <p className="text-sm text-muted-foreground">{t('admin_albums_total', { count: total })}</p>

            <AlbumCategoryManager
                categories={categories}
                onRefresh={loadCategories}
            />

            {/* Album List */}
            {loading ? (
                <div className="text-center py-20 text-muted-foreground">{t('common_loading')}</div>
            ) : albums.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">{t('admin_albums_empty')}</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {albums.map(album => (
                        <Card key={album.id} className="overflow-hidden group">
                            <div className="aspect-[4/3] relative bg-muted">
                                {album.cover_media?.url_thumb || album.cover_media?.url ? (
                                    <Image
                                        src={album.cover_media.url_thumb || album.cover_media.url}
                                        alt={album.title}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                                    </div>
                                )}
                                {album.is_protected && (
                                    <span className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded">
                                        <Lock className="h-3.5 w-3.5" />
                                    </span>
                                )}
                                {album.status === 'draft' && (
                                    <span className="absolute top-2 left-2 bg-yellow-500/80 text-white text-xs px-2 py-0.5 rounded">
                                        {t('common_draft')}
                                    </span>
                                )}
                            </div>
                            <CardContent className="p-4">
                                <h3 className="font-medium truncate mb-1">{album.title}</h3>
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                    <span>{t('admin_album_photos_count', { count: album.media_count })}</span>
                                    <span>{new Date(album.created_at).toLocaleDateString()}</span>
                                </div>
                                {album.tags && album.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {album.tags.map(tag => (
                                            <span key={tag} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {album.categories && album.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {album.categories.map(category => (
                                            <span key={category.id} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                                                {category.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Link href={`/admin/albums/${album.id}`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Edit className="h-3.5 w-3.5 mr-1" /> {t('common_edit')}
                                        </Button>
                                    </Link>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(album.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={page <= 1}
                        onClick={() => loadAlbums(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-4">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages}
                        onClick={() => loadAlbums(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Create Album Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('admin_album_dialog_title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>{t('admin_album_field_title')}</Label>
                            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                                placeholder={t('admin_album_field_title_placeholder')} className="mt-1" />
                        </div>
                        <div>
                            <Label>{t('admin_album_field_description')}</Label>
                            <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                                placeholder={t('admin_album_field_description_placeholder')} className="mt-1" />
                        </div>
                        <div>
                            <Label>{t('admin_album_field_slug')}</Label>
                            <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)}
                                placeholder={t('admin_album_field_slug_placeholder')} className="mt-1" />
                        </div>
                        <div>
                            <Label>{t('admin_album_field_tags')}</Label>
                            <Input value={newTags} onChange={(e) => setNewTags(e.target.value)}
                                placeholder={t('admin_album_field_tags_placeholder')} className="mt-1" />
                        </div>
                        <div>
                            <Label>{t('admin_album_field_categories')}</Label>
                            <MultiSelect
                                selected={newCategoryIds}
                                onChange={setNewCategoryIds}
                                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                placeholder={t('admin_album_field_categories_placeholder')}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>{t('admin_album_field_password')}</Label>
                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t('admin_album_field_password_placeholder')} className="mt-1" />
                        </div>
                        <div>
                            <Label>{t('admin_album_field_status')}</Label>
                            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as 'draft' | 'published')}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="published">{t('common_published')}</SelectItem>
                                    <SelectItem value="draft">{t('common_draft')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>{t('common_cancel')}</Button>
                        <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                            {creating ? t('common_creating') : t('common_create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => { if (!open) setDeleteId(null); }}
                title={t('admin_album_delete_title')}
                description={t('admin_album_delete_desc')}
                onConfirm={handleDelete}
                confirmText={t('common_delete')}
                destructive
            />
        </div>
    );
}
