'use client';

import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    listMedia, listCategories, listTags, deleteMedia as deleteMediaApi,
    listDeviceStats,
    type MediaItem, type MediaCategory, type MediaTag, type DeviceStats,
} from '@/lib/admin/api';
import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { toast } from "sonner";
import { t } from '@/lib/i18n';

// Import new components
import MediaUpload from '@/components/admin/media/MediaUpload';
import MediaFilter from '@/components/admin/media/MediaFilter';
import MediaGrid from '@/components/admin/media/MediaGrid';
import MediaEditDialog from '@/components/admin/media/MediaEditDialog';
import CategoryManager from '@/components/admin/media/CategoryManager';
import TagList from '@/components/admin/media/TagList';
import DeviceStatsPanel from '@/components/admin/media/DeviceStats';

export default function MediaPage() {
    // Media list state
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        if (typeof window === 'undefined') return 'grid';
        const stored = window.localStorage.getItem('admin_media_view_mode');
        return stored === 'list' ? 'list' : 'grid';
    });

    // Edit dialog state
    const [editItem, setEditItem] = useState<MediaItem | null>(null);

    // Delete confirm state
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Categories & Tags state
    const [categories, setCategories] = useState<MediaCategory[]>([]);
    const [tags, setTags] = useState<MediaTag[]>([]);
    const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
    const [deviceLoading, setDeviceLoading] = useState(false);

    const loadMedia = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await listMedia({
                page: p,
                pageSize: 24,
                q: search || undefined,
                category: filterCategory || undefined,
                tag: filterTag || undefined,
            });
            setMedia(res.results);
            setTotalPages(res.totalPages);
            setTotal(res.total);
            setPage(p);
        } catch (e) {
            console.error('Failed to load media:', e);
            toast.error(t('admin_media_load_failed'));
        }
        setLoading(false);
    }, [search, filterCategory, filterTag]);

    const loadCategories = useCallback(async () => {
        try {
            const res = await listCategories();
            setCategories(res.categories);
        } catch (e) {
            console.error('Failed to load categories:', e);
        }
    }, []);

    const loadTags = useCallback(async () => {
        try {
            const res = await listTags();
            setTags(res.tags);
        } catch (e) {
            console.error('Failed to load tags:', e);
        }
    }, []);

    const loadDeviceStats = useCallback(async () => {
        setDeviceLoading(true);
        try {
            const res = await listDeviceStats();
            if (res.ok) {
                setDeviceStats({ cameras: res.cameras || [], lenses: res.lenses || [] });
            }
        } catch (e) {
            console.error('Failed to load device stats:', e);
        } finally {
            setDeviceLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMedia(1);
    }, [loadMedia]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('admin_media_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        loadCategories();
        loadTags();
        loadDeviceStats();
    }, [loadCategories, loadTags, loadDeviceStats]);

    // Delete handler
    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteMediaApi(deleteId);
            toast.success(t('admin_media_delete_success'));
            setDeleteId(null);
            loadMedia(page);
        } catch (e) {
            console.error('Failed to delete:', e);
            toast.error(t('admin_media_delete_failed'));
        }
    };

    // Copy to clipboard
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success(t('common_copied'));
    };

    // Search handler
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadMedia(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('admin_media_title')}</h1>
            </div>

            <Tabs defaultValue="media" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="media">{t('admin_media_tab_list')}</TabsTrigger>
                    <TabsTrigger value="categories">{t('admin_media_tab_categories')}</TabsTrigger>
                    <TabsTrigger value="tags">{t('admin_media_tab_tags')}</TabsTrigger>
                    <TabsTrigger value="devices">{t('admin_media_tab_devices')}</TabsTrigger>
                </TabsList>

                {/* Media List Tab */}
                <TabsContent value="media" className="space-y-4">
                    {/* Upload Section */}
                    <MediaUpload
                        categories={categories}
                        onUploadSuccess={() => loadMedia(1)}
                    />

                    {/* Search & Filter */}
                    <MediaFilter
                        search={search}
                        setSearch={setSearch}
                        filterCategory={filterCategory}
                        setFilterCategory={setFilterCategory}
                        filterTag={filterTag}
                        setFilterTag={setFilterTag}
                        onSearch={handleSearch}
                        categories={categories}
                        tags={tags}
                    />

                    {/* View Mode & Info */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {t('admin_media_total_info', { total, page, totalPages })}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Media Grid / List */}
                    <MediaGrid
                        media={media}
                        viewMode={viewMode}
                        loading={loading}
                        onEdit={setEditItem}
                        onDelete={setDeleteId}
                        onCopy={handleCopy}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <Button variant="outline" size="sm" disabled={page <= 1}
                                onClick={() => loadMedia(page - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm px-4">
                                {page} / {totalPages}
                            </span>
                            <Button variant="outline" size="sm" disabled={page >= totalPages}
                                onClick={() => loadMedia(page + 1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-4">
                    <CategoryManager
                        categories={categories}
                        onRefresh={loadCategories}
                    />
                </TabsContent>

                {/* Tags Tab */}
                <TabsContent value="tags" className="space-y-4">
                    <TagList tags={tags} />
                </TabsContent>

                {/* Devices Tab */}
                <TabsContent value="devices" className="space-y-4">
                    <DeviceStatsPanel
                        data={deviceStats}
                        loading={deviceLoading}
                        onRefresh={loadDeviceStats}
                    />
                </TabsContent>
            </Tabs>

            {/* Edit Media Dialog */}
            <MediaEditDialog
                item={editItem}
                open={!!editItem}
                onOpenChange={(open) => { if (!open) setEditItem(null); }}
                onSaveSuccess={() => loadMedia(page)}
                categories={categories}
            />

            {/* Delete Media Confirm */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => { if (!open) setDeleteId(null); }}
                title={t('admin_media_delete_title')}
                description={t('admin_media_delete_desc')}
                onConfirm={handleDelete}
                confirmText={t('common_delete')}
                destructive
            />
        </div>
    );
}
