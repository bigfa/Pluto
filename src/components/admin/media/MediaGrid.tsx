import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Copy, Edit, Trash2 } from 'lucide-react';
import MediaListView from '@/components/admin/MediaListView';
import type { MediaItem } from '@/lib/admin/api';
import { t } from '@/lib/i18n';

interface MediaGridProps {
    media: MediaItem[];
    viewMode: 'grid' | 'list';
    loading: boolean;
    onEdit: (item: MediaItem) => void;
    onDelete: (id: string) => void;
    onCopy: (text: string) => void;
}

export default function MediaGrid({
    media, viewMode, loading,
    onEdit, onDelete, onCopy
}: MediaGridProps) {
    if (loading) {
        return <div className="text-center py-20 text-muted-foreground">{t('common_loading')}</div>;
    }

    if (media.length === 0) {
        return <div className="text-center py-20 text-muted-foreground">{t('common_no_data')}</div>;
    }

    if (viewMode === 'list') {
        return (
            <MediaListView
                media={media}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopy={onCopy}
            />
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {media.map(item => (
                <div key={item.id} className="group relative aspect-square overflow-hidden border bg-muted">
                    <Image
                        src={item.url_thumb || item.url}
                        alt={item.alt || ''}
                        fill
                        sizes="(max-width: 768px) 25vw, 12vw"
                        className="object-cover"
                        loading="lazy"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end opacity-0 group-hover:opacity-100">
                        <div className="w-full p-2 flex items-center justify-between">
                            <span className="text-white text-xs truncate flex-1 mr-2">
                                {item.title || item.filename || t('common_untitled')}
                            </span>
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost"
                                    className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                                    onClick={() => onCopy(item.url)}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost"
                                    className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                                    onClick={() => onEdit(item)}>
                                    <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost"
                                    className="h-7 w-7 text-white hover:text-red-400 hover:bg-white/20"
                                    onClick={() => onDelete(item.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    {item.visibility === 'private' && (
                        <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {t('common_private')}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
