import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { Edit, Trash2, Plus } from 'lucide-react';
import { createCategory, updateCategory as updateCategoryApi, deleteCategory as deleteCategoryApi, type MediaCategory } from '@/lib/admin/api';
import { toast } from "sonner";
import { t } from '@/lib/i18n';

interface CategoryManagerProps {
    categories: MediaCategory[];
    onRefresh: () => void;
}

export default function CategoryManager({ categories, onRefresh }: CategoryManagerProps) {
    // New category state
    const [newCatName, setNewCatName] = useState('');
    const [newCatSlug, setNewCatSlug] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');
    const [creatingCat, setCreatingCat] = useState(false);

    // Edit category state
    const [editCat, setEditCat] = useState<MediaCategory | null>(null);
    const [editCatName, setEditCatName] = useState('');
    const [editCatSlug, setEditCatSlug] = useState('');
    const [editCatDesc, setEditCatDesc] = useState('');
    const [savingCat, setSavingCat] = useState(false);

    // Delete category confirm state
    const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

    const handleCreateCategory = async () => {
        if (!newCatName.trim()) return;
        setCreatingCat(true);
        try {
            await createCategory({
                name: newCatName.trim(),
                slug: newCatSlug.trim() || undefined,
                description: newCatDesc.trim() || undefined,
            });
            toast.success(t('admin_category_create_success'));
            setNewCatName('');
            setNewCatSlug('');
            setNewCatDesc('');
            onRefresh();
        } catch (e) {
            console.error('Failed to create category:', e);
            toast.error(t('admin_category_create_failed'));
        }
        setCreatingCat(false);
    };

    const openEditCategory = (cat: MediaCategory) => {
        setEditCat(cat);
        setEditCatName(cat.name);
        setEditCatSlug(cat.slug);
        setEditCatDesc(cat.description || '');
    };

    const handleSaveCategory = async () => {
        if (!editCat) return;
        setSavingCat(true);
        try {
            await updateCategoryApi(editCat.id, {
                name: editCatName.trim(),
                slug: editCatSlug.trim() || undefined,
                description: editCatDesc.trim() || undefined,
            });
            toast.success(t('admin_category_update_success'));
            setEditCat(null);
            onRefresh();
        } catch (e) {
            console.error('Failed to update category:', e);
            toast.error(t('admin_category_update_failed'));
        }
        setSavingCat(false);
    };

    const handleDeleteCategory = async () => {
        if (!deleteCatId) return;
        try {
            await deleteCategoryApi(deleteCatId);
            toast.success(t('admin_category_delete_success'));
            setDeleteCatId(null);
            onRefresh();
        } catch (e) {
            console.error('Failed to delete category:', e);
            toast.error(t('admin_category_delete_failed'));
        }
    };

    return (
        <div className="space-y-4">
            {/* Create Category */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('admin_category_create_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <Label>{t('admin_category_name')}</Label>
                            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                                placeholder={t('admin_category_name_placeholder')} className="mt-1" />
                        </div>
                        <div className="flex-1">
                            <Label>{t('admin_category_slug')}</Label>
                            <Input value={newCatSlug} onChange={(e) => setNewCatSlug(e.target.value)}
                                placeholder={t('admin_category_slug_placeholder_optional')} className="mt-1" />
                        </div>
                        <div className="flex-1">
                            <Label>{t('admin_category_desc')}</Label>
                            <Input value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)}
                                placeholder={t('admin_category_desc_placeholder_optional')} className="mt-1" />
                        </div>
                        <Button onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()}>
                            <Plus className="h-4 w-4 mr-1" />
                            {creatingCat ? t('common_creating') : t('common_create')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Category List */}
            <Card>
                <CardContent className="pt-6">
                    {categories.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">{t('admin_category_empty')}</div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="py-3 px-4 text-left font-medium">{t('admin_category_table_name')}</th>
                                        <th className="py-3 px-4 text-left font-medium">{t('admin_category_table_slug')}</th>
                                        <th className="py-3 px-4 text-left font-medium">{t('admin_category_table_desc')}</th>
                                        <th className="py-3 px-4 text-left font-medium">{t('admin_category_table_media_count')}</th>
                                        <th className="py-3 px-4 text-left font-medium w-[120px]">{t('admin_category_table_actions')}</th>
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
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8"
                                                        onClick={() => openEditCategory(cat)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => setDeleteCatId(cat.id)}>
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

            {/* Edit Category Dialog */}
            <Dialog open={!!editCat} onOpenChange={(open) => { if (!open) setEditCat(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('admin_category_edit_title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>{t('admin_category_name')}</Label>
                            <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                                placeholder={t('admin_category_name_placeholder')} className="mt-1" />
                        </div>
                        <div>
                            <Label>{t('admin_category_slug')}</Label>
                            <Input value={editCatSlug} onChange={(e) => setEditCatSlug(e.target.value)}
                                placeholder={t('admin_category_slug_placeholder')} className="mt-1" />
                        </div>
                        <div>
                            <Label>{t('admin_category_desc')}</Label>
                            <Input value={editCatDesc} onChange={(e) => setEditCatDesc(e.target.value)}
                                placeholder={t('admin_category_desc_placeholder')} className="mt-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditCat(null)}>{t('common_cancel')}</Button>
                        <Button onClick={handleSaveCategory} disabled={savingCat}>
                            {savingCat ? t('common_saving') : t('common_save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Category Confirm */}
            <ConfirmDialog
                open={!!deleteCatId}
                onOpenChange={(open) => { if (!open) setDeleteCatId(null); }}
                title={t('admin_category_delete_title')}
                description={t('admin_category_delete_desc')}
                onConfirm={handleDeleteCategory}
                confirmText={t('common_delete')}
                destructive
            />
        </div>
    );
}
