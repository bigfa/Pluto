'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { listMedia, type MediaItem } from '@/lib/admin/api';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';
import { t } from '@/lib/i18n';

interface MediaPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedIds: string[];
    onSelectionChange: (ids: string[], items: MediaItem[]) => void;
    multiple?: boolean;
}

export default function MediaPicker({
    open,
    onOpenChange,
    selectedIds,
    onSelectionChange,
    multiple = true,
}: MediaPickerProps) {
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    const loadMedia = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await listMedia({ page: p, pageSize: 18 });
            setMediaList(res.results);
            setTotalPages(res.totalPages);
            setPage(p);
        } catch (e) {
            console.error('Failed to load media:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadMedia(1);
        }
    }, [open, loadMedia]);

    const handleToggle = (item: MediaItem) => {
        let newIds: string[];

        if (multiple) {
            if (selectedIds.includes(item.id)) {
                newIds = selectedIds.filter(id => id !== item.id);
            } else {
                newIds = [...selectedIds, item.id];
            }
        } else {
            if (selectedIds.includes(item.id)) {
                newIds = [];
            } else {
                newIds = [item.id];
            }
        }

        onSelectionChange(newIds, [item]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('admin_media_picker_title')}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 py-4">
                    {loading && mediaList.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">{t('common_loading')}</div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {mediaList.map((item) => {
                                const isSelected = selectedIds.includes(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "aspect-square relative cursor-pointer overflow-hidden border-2 transition-all",
                                            isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent"
                                        )}
                                        onClick={() => handleToggle(item)}
                                    >
                                        <Image
                                            src={item.url_thumb || item.url}
                                            alt=""
                                            fill
                                            sizes="(max-width: 768px) 25vw, 12vw"
                                            className="object-cover"
                                            unoptimized
                                        />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <CheckCircle className="text-primary-foreground h-6 w-6" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t mt-auto">
                    <div className="text-sm text-muted-foreground px-2">
                        {t('admin_media_picker_selected', { count: selectedIds.length })}
                    </div>
                    <div className="flex gap-2 p-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1 || loading}
                            onClick={() => loadMedia(page - 1)}
                        >
                            {t('common_previous')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || loading}
                            onClick={() => loadMedia(page + 1)}
                        >
                            {t('common_next')}
                        </Button>
                        <Button onClick={() => onOpenChange(false)}>{t('common_done')}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
