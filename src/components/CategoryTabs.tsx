'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/types/media';
import { fetchCategories } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n';

interface CategoryTabsProps {
    selectedCategory: string | null;
    onCategoryChange: (category: string | null) => void;
}

export default function CategoryTabs({ selectedCategory, onCategoryChange }: CategoryTabsProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCategories() {
            try {
                const response = await fetchCategories();
                if (response.ok) {
                    setCategories(response.categories || []);
                }
            } catch (error) {
                console.error('Failed to load categories:', error);
            } finally {
                setLoading(false);
            }
        }
        loadCategories();
    }, []);

    if (loading) {
        return (
            <div className="w-full overflow-x-auto">
                <div className="h-10 bg-muted animate-pulse rounded-md"></div>
            </div>
        );
    }

    if (categories.length === 0) {
        return null;
    }

    return (
        <div className="w-full overflow-x-auto scrollbar-none">
            <div className="flex gap-2 min-w-full w-fit">
                <Button
                    variant={selectedCategory === null ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onCategoryChange(null)}
                >
                    {t('home_all')}
                </Button>
                {categories.map((category) => (
                    <Button
                        key={category.id}
                        variant={selectedCategory === category.slug ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onCategoryChange(category.slug)}
                        className="gap-2"
                    >
                        {category.name}
                        {category.media_count !== undefined && (
                            <Badge variant="secondary" className="ml-1">
                                {category.media_count}
                            </Badge>
                        )}
                    </Button>
                ))}
            </div>
        </div>
    );
}
