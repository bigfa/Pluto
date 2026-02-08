import Image from 'next/image';
import { type MediaItem } from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Copy, Edit, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';

interface MediaListViewProps {
    media: MediaItem[];
    onEdit: (item: MediaItem) => void;
    onDelete: (id: string) => void;
    onCopy: (text: string) => void;
}

export default function MediaListView({ media, onEdit, onDelete, onCopy }: MediaListViewProps) {
    const formatDateTime = (value?: string | null, fallback?: string | null) => {
        const parseDate = (val?: string | null) => {
            if (!val) return null;
            const parsed = new Date(val);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        };
        const date = parseDate(value) || parseDate(fallback);
        return date ? date.toLocaleString() : '-';
    };

    if (media.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">{t('common_no_data')}</div>;
    }

    return (
        <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left font-medium w-[80px]">{t('admin_media_table_preview')}</th>
                        <th className="py-3 px-4 text-left font-medium">{t('admin_media_table_fileinfo')}</th>
                        <th className="py-3 px-4 text-left font-medium">{t('admin_media_table_exif')}</th>
                        <th className="py-3 px-4 text-left font-medium">{t('admin_media_table_category_tag')}</th>
                        <th className="py-3 px-4 text-left font-medium w-[90px]">{t('admin_media_table_views')}</th>
                        <th className="py-3 px-4 text-left font-medium w-[100px]">{t('admin_media_table_visibility')}</th>
                        <th className="py-3 px-4 text-left font-medium w-[120px]">{t('admin_media_table_actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {media.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-4">
                                <div className="h-12 w-12 overflow-hidden bg-muted border">
                                    <Image
                                        src={item.url_thumb || item.url}
                                        alt={item.alt || ''}
                                        width={48}
                                        height={48}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        unoptimized
                                    />
                                </div>
                            </td>
                            <td className="py-3 px-4">
                                <div className="font-medium truncate max-w-[200px]" title={item.title || item.filename}>
                                    {item.title || item.filename || t('common_untitled')}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.filename}>
                                    {item.filename}
                                </div>
                            </td>
                            <td className="py-3 px-4">
                                <div className="space-y-1 text-xs text-muted-foreground w-[200px]">
                                    {(item.camera_make || item.camera_model) ? (
                                        <div className="font-medium text-foreground">
                                            {item.camera_make} {item.camera_model}
                                        </div>
                                    ) : (
                                        <span>-</span>
                                    )}
                                    {item.lens_model && (
                                        <div className="truncate" title={item.lens_model}>{item.lens_model}</div>
                                    )}
                                    <div className="flex gap-2 text-[10px] opacity-80">
                                        {item.focal_length && <span>{item.focal_length}mm</span>}
                                        {item.aperture && <span>{item.aperture}</span>}
                                        {item.shutter_speed && <span>{item.shutter_speed}s</span>}
                                        {item.iso && <span>ISO {item.iso}</span>}
                                    </div>
                                    <div>{formatDateTime(item.datetime_original, item.created_at)}</div>
                                </div>
                            </td>
                            <td className="py-3 px-4">
                                <div className="space-y-1">
                                    <div className="text-xs">
                                        {item.categories && item.categories.length > 0 ? (
                                            item.categories.map(c => c.name).join(', ')
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {item.tags && item.tags.length > 0 ? (
                                            item.tags.join(', ')
                                        ) : (
                                            '-'
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="py-3 px-4">
                                <span className="text-xs font-medium">{item.view_count || 0}</span>
                            </td>
                            <td className="py-3 px-4">
                                {item.visibility === 'private' ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                        {t('common_private')}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground text-xs">{t('common_public')}</span>
                                )}
                            </td>
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onCopy(item.url)} title={t('common_copy_link')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)} title={t('common_edit')}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(item.id)} title={t('common_delete')}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
