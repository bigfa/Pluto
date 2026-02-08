import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from 'lucide-react';
import type { MediaCategory, MediaTag } from '@/lib/admin/api';
import { t } from '@/lib/i18n';

interface MediaFilterProps {
    search: string;
    setSearch: (value: string) => void;
    filterCategory: string;
    setFilterCategory: (value: string) => void;
    filterTag: string;
    setFilterTag: (value: string) => void;
    sort: 'date' | 'likes' | 'views';
    setSort: (value: 'date' | 'likes' | 'views') => void;
    onSearch: (e: React.FormEvent) => void;
    categories: MediaCategory[];
    tags: MediaTag[];
}

export default function MediaFilter({
    search, setSearch,
    filterCategory, setFilterCategory,
    filterTag, setFilterTag,
    sort, setSort,
    onSearch,
    categories, tags
}: MediaFilterProps) {
    return (
        <Card>
            <CardContent className="pt-6">
                <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-4">
                    <Input
                        placeholder={t('admin_media_search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1"
                    />
                    <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v === '_all' ? '' : v); }}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={t('admin_media_filter_all_categories')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all">{t('admin_media_filter_all_categories')}</SelectItem>
                            {categories.map(c => (
                                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterTag} onValueChange={(v) => { setFilterTag(v === '_all' ? '' : v); }}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={t('admin_media_filter_all_tags')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all">{t('admin_media_filter_all_tags')}</SelectItem>
                            {tags.map(t => (
                                <SelectItem key={t.tag} value={t.tag}>{t.tag} ({t.count})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={sort} onValueChange={(v) => setSort(v as 'date' | 'likes' | 'views')}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder={t('admin_media_filter_sort')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date">{t('admin_media_sort_date')}</SelectItem>
                            <SelectItem value="likes">{t('admin_media_sort_likes')}</SelectItem>
                            <SelectItem value="views">{t('admin_media_sort_views')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button type="submit">{t('common_search')}</Button>
                    {(search || filterCategory || filterTag) && (
                        <Button type="button" variant="ghost" onClick={() => {
                            setSearch('');
                            setFilterCategory('');
                            setFilterTag('');
                        }}>
                            <X className="h-4 w-4 mr-1" /> {t('common_clear')}
                        </Button>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
