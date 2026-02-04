import { Card, CardContent } from '@/components/ui/card';
import type { MediaTag } from '@/lib/admin/api';
import { t } from '@/lib/i18n';

interface TagListProps {
    tags: MediaTag[];
}

export default function TagList({ tags }: TagListProps) {
    return (
        <Card>
            <CardContent className="pt-6">
                {tags.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">{t('admin_tag_empty')}</div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {tags.map(t => (
                            <span key={t.tag}
                                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground">
                                {t.tag}
                                <span className="ml-1.5 text-xs opacity-60">({t.count})</span>
                            </span>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
