import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { Edit, Trash2, Plus } from 'lucide-react';
import {
    createAlbumCategory,
    updateAlbumCategory as updateAlbumCategoryApi,
    deleteAlbumCategory as deleteAlbumCategoryApi,
    type AlbumCategory,
} from '@/lib/admin/api';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';

interface AlbumCategoryManagerProps {
    categories: AlbumCategory[];
    onRefresh: () => void;
}

export default function AlbumCategoryManager({ categories, onRefresh }: AlbumCategoryManagerProps) {
    const [newName, setNewName] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newShow, setNewShow] = useState(true);
    const [creating, setCreating] = useState(false);

    const [editItem, setEditItem] = useState<AlbumCategory | null>(null);
    const [editName, setEditName] = useState('');
    const [editSlug, setEditSlug] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editShow, setEditShow] = useState(true);
    const [saving, setSaving] = useState(false);

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            await createAlbumCategory({
                name: newName.trim(),
                slug: newSlug.trim() || undefined,
                description: newDesc.trim() || undefined,
                show_in_frontend: newShow,
            });
            toast.success(t('admin_album_category_create_success'));
            setNewName('');
            setNewSlug('');
            setNewDesc('');
            setNewShow(true);
            onRefresh();
        } catch (e) {
            console.error('Failed to create album category:', e);
            toast.error(t('admin_album_category_create_failed'));
        }
        setCreating(false);
    };

    const openEdit = (cat: AlbumCategory) => {
        setEditItem(cat);
        setEditName(cat.name);
        setEditSlug(cat.slug);
        setEditDesc(cat.description || '');
        setEditShow(Boolean(cat.show_in_frontend ?? 1));
    };

    const handleSave = async () => {
        if (!editItem) return;
        setSaving(true);
        try {
            await updateAlbumCategoryApi(editItem.id, {
                name: editName.trim(),
                slug: editSlug.trim() || undefined,
                description: editDesc.trim() || undefined,
                show_in_frontend: editShow,
            });
            toast.success(t('admin_album_category_update_success'));
            setEditItem(null);
            onRefresh();
        } catch (e) {
            console.error('Failed to update album category:', e);
            toast.error(t('admin_album_category_update_failed'));
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteAlbumCategoryApi(deleteId);
            toast.success(t('admin_album_category_delete_success'));
            setDeleteId(null);
            onRefresh();
        } catch (e) {
            console.error('Failed to delete album category:', e);
            toast.error(t('admin_album_category_delete_failed'));
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('admin_album_category_create_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <Label>{t('admin_album_category_name')}</Label>
                            <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                                placeholder={t('admin_album_category_name_placeholder')} className="mt-1" />
                        </div>
                        <div className="flex-1">
                            <Label>{t('admin_album_category_slug')}</Label>
                            <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)}
                                placeholder={t('admin_album_category_slug_placeholder_optional')} className="mt-1" />
                        </div>
                        <div className="flex-1">
                            <Label>{t('admin_album_category_desc')}</Label>
                            <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                                placeholder={t('admin_album_category_desc_placeholder_optional')} className="mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label>{t('admin_album_category_table_show')}</Label>
                            <button
                                type="button"
                                onClick={() => setNewShow(!newShow)}
                                className={`inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                                    newShow ? 'bg-primary border-primary' : 'bg-muted border-border'
                                }`}
                                aria-label={t('admin_album_category_table_show')}
                            >
                                <span
                                    className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                        newShow ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                        <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                            <Plus className="h-4 w-4 mr-1" />
                            {creating ? t('common_creating') : t('common_create')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    {categories.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">{t('admin_album_category_empty')}</div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="py-3 px-4 text-left font-medium">{t('admin_album_category_table_name')}</th>
                                        <th className="py-3 px-4 text-left font-medium">{t('admin_album_category_table_slug')}</th>
                                        <th className="py-3 px-4 text-left font-medium">{t('admin_album_category_table_desc')}</th>
                                        <th className="py-3 px-4 text-left font-medium">{t('admin_album_category_table_media_count')}</th>
                                        <th className="py-3 px-4 text-left font-medium">{t('admin_album_category_table_show')}</th>
                                        <th className="py-3 px-4 text-left font-medium w-[120px]">{t('admin_album_category_table_actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(cat => (
                                        <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/50">
                                            <td className="py-3 px-4 font-medium">{cat.name}</td>
                                            <td className="py-3 px-4 text-muted-foreground">{cat.slug}</td>
                                            <td className="py-3 px-4 text-muted-foreground">{cat.description || '-'}</td>
                                            <td className="py-3 px-4">{cat.media_count}</td>
                                            <td className="py-3 px-4">
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            await updateAlbumCategoryApi(cat.id, {
                                                                show_in_frontend: !Boolean(cat.show_in_frontend ?? 1),
                                                            });
                                                            onRefresh();
                                                        } catch (e) {
                                                            console.error('Failed to update album category:', e);
                                                            toast.error(t('admin_album_category_update_failed'));
                                                        }
                                                    }}
                                                    className={`inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                                                        Boolean(cat.show_in_frontend ?? 1)
                                                            ? 'bg-primary border-primary'
                                                            : 'bg-muted border-border'
                                                    }`}
                                                    aria-label={t('admin_album_category_table_show')}
                                                >
                                                    <span
                                                        className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                                            Boolean(cat.show_in_frontend ?? 1) ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8"
                                                        onClick={() => openEdit(cat)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => setDeleteId(cat.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('admin_album_category_edit_title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>{t('admin_album_category_name')}</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                                placeholder={t('admin_album_category_name_placeholder')} className="mt-1" />
                        </div>
                        <div>
                            <Label>{t('admin_album_category_slug')}</Label>
                            <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)}
                                placeholder={t('admin_album_category_slug_placeholder')} className="mt-1" />
                        </div>
                        <div>
                            <Label>{t('admin_album_category_desc')}</Label>
                            <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                                placeholder={t('admin_album_category_desc_placeholder')} className="mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t('admin_album_category_table_show')}</Label>
                            <button
                                type="button"
                                onClick={() => setEditShow(!editShow)}
                                className={`inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                                    editShow ? 'bg-primary border-primary' : 'bg-muted border-border'
                                }`}
                                aria-label={t('admin_album_category_table_show')}
                            >
                                <span
                                    className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                        editShow ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditItem(null)}>{t('common_cancel')}</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? t('common_saving') : t('common_save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => { if (!open) setDeleteId(null); }}
                title={t('admin_album_category_delete_title')}
                description={t('admin_album_category_delete_desc')}
                onConfirm={handleDelete}
                confirmText={t('common_delete')}
                destructive
            />
        </div>
    );
}
