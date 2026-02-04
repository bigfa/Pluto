'use client';

import { useEffect, useState } from 'react';
import { Category } from '@/types/media';
import { fetchCategories } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function CategoriesClient() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function loadCategories() {
            try {
                const response = await fetchCategories();
                if (response.ok) {
                    setCategories(response.categories || []);
                }
            } catch (error) {
                console.error('Failed to load categories:', error);
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        loadCategories();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('categories_title')}</h1>
                        <p className="text-muted-foreground">{t('categories_subtitle')}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-destructive/15 border border-destructive rounded-lg p-4">
                        <p className="text-destructive">{t('categories_error')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">{t('categories_title')}</h1>
                    <p className="text-muted-foreground">{t('categories_count', { count: categories.length })}</p>
                </div>

                {categories.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">{t('categories_empty')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((category) => (
                            <Link key={category.id} href={`/categories/${category.slug}`}>
                                <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-xl">{category.name}</CardTitle>
                                            {category.media_count !== undefined && (
                                                <Badge variant="secondary" className="ml-2">
                                                    {category.media_count}
                                                </Badge>
                                            )}
                                        </div>
                                        {category.description && (
                                            <CardDescription className="mt-2">
                                                {category.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground">
                                            {category.media_count || 0} photo{(category.media_count || 0) !== 1 ? 's' : ''}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
