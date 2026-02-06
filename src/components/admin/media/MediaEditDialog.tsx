import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from '@/components/ui/multi-select';
import { updateMedia, type MediaItem, type MediaCategory } from '@/lib/admin/api';
import { toast } from "sonner";
import { t } from '@/lib/i18n';

interface MediaEditDialogProps {
    item: MediaItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaveSuccess: () => void;
    categories: MediaCategory[];
}

export default function MediaEditDialog({
    item, open, onOpenChange, onSaveSuccess, categories
}: MediaEditDialogProps) {
    if (!item) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <MediaEditForm
                key={item.id}
                item={item}
                categories={categories}
                onOpenChange={onOpenChange}
                onSaveSuccess={onSaveSuccess}
            />
        </Dialog>
    );
}

function MediaEditForm({
    item,
    categories,
    onOpenChange,
    onSaveSuccess,
}: {
    item: MediaItem;
    categories: MediaCategory[];
    onOpenChange: (open: boolean) => void;
    onSaveSuccess: () => void;
}) {
    const [title, setTitle] = useState(item.title || '');
    const [alt, setAlt] = useState(item.alt || '');
    const [categoryIds, setCategoryIds] = useState<string[]>(
        item.category_ids || item.categories?.map(c => c.id) || []
    );
    const [tags, setTags] = useState(item.tags?.join(', ') || '');
    const [visibility, setVisibility] = useState(item.visibility || 'public');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
            await updateMedia(item.id, {
                title,
                alt,
                category_ids: categoryIds,
                tags: tagsArray,
                visibility,
            });
            toast.success(t('admin_media_edit_save_success'));
            onSaveSuccess();
            onOpenChange(false);
        } catch (e) {
            console.error('Failed to save:', e);
            toast.error(t('admin_media_edit_save_failed'));
        }
        setSaving(false);
    };

    return (
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
                <DialogTitle>{t('admin_media_edit_title')}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
                <div className="flex justify-center">
                    <div className="relative w-full max-w-xs h-40">
                        <Image
                            src={item.url_thumb || item.url}
                            alt=""
                            fill
                            sizes="320px"
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                </div>
                <div>
                    <Label>{t('admin_media_edit_label_title')}</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('admin_media_edit_placeholder_title')} className="mt-1" />
                </div>
                <div>
                    <Label>{t('admin_media_edit_label_alt')}</Label>
                    <Input value={alt} onChange={(e) => setAlt(e.target.value)}
                        placeholder={t('admin_media_edit_placeholder_alt')} className="mt-1" />
                </div>
                <div>
                    <Label>{t('admin_media_edit_label_category')}</Label>
                    <MultiSelect
                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                        selected={categoryIds}
                        onChange={setCategoryIds}
                        placeholder={t('admin_media_edit_placeholder_category')}
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label>{t('admin_media_edit_label_tags')}</Label>
                    <Input value={tags} onChange={(e) => setTags(e.target.value)}
                        placeholder={t('admin_media_edit_placeholder_tags')} className="mt-1" />
                </div>
                <div>
                    <Label>{t('admin_media_edit_label_visibility')}</Label>
                    <Select value={visibility} onValueChange={setVisibility}>
                        <SelectTrigger className="mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="public">{t('common_public')}</SelectItem>
                            <SelectItem value="private">{t('common_private')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                    <p>{t('admin_media_edit_filename')}: {item.filename}</p>
                    <p>{t('admin_media_edit_url')}: <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:underline truncate inline-block max-w-[300px] align-bottom">
                        {item.url}
                    </a></p>
                    {item.camera_model && <p>{t('admin_media_edit_camera')}: {item.camera_make} {item.camera_model}</p>}
                    {item.lens_model && <p>{t('admin_media_edit_lens')}: {item.lens_model}</p>}
                    {item.location_name && <p>{t('admin_media_edit_location')}: {item.location_name}</p>}
                </div>
            </div>
            <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common_cancel')}</Button>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? t('common_saving') : t('common_save')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
