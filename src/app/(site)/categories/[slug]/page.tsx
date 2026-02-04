import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CategoryDetailClient from './CategoryDetailClient';
import type { Media } from '@/types/media';
import type { Metadata } from 'next';
import { getEnv } from '@/lib/env';
import { getCategoryBySlug } from '@/services/categoryServices';
import { listMedia } from '@/services/mediaServices';
import { t } from '@/lib/i18n';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;

    try {
        const env = await getEnv();
        const response = await getCategoryBySlug(env, slug);

        if (response.ok && response.category) {
            const category = response.category;
            return {
                title: `${category.name} | ${t('categories_title')}`,
                description: category.description || `${t('categories_subtitle')}`,
                openGraph: {
                    title: `${category.name} | ${t('categories_title')}`,
                    description: category.description || `${t('categories_subtitle')}`,
                },
                twitter: {
                    card: 'summary_large_image',
                    title: `${category.name} | ${t('categories_title')}`,
                    description: category.description || `${t('categories_subtitle')}`,
                },
            };
        }
    } catch (error) {
        console.error("Failed to fetch category metadata:", error);
    }

    return {
        title: t('category_not_found'),
    };
}

export default async function CategoryDetailPage({ params }: PageProps) {
    const { slug } = await params;

    let category = null;
    let media: Media[] = [];

    try {
        const env = await getEnv();

        // Get category directly by slug
        const categoryResponse = await getCategoryBySlug(env, slug);
        category = categoryResponse.ok ? categoryResponse.category : null;

        // Get media for this category from service layer
        if (category) {
            const mediaData = await listMedia(env, { category: slug, pageSize: 100 });
            media = mediaData?.ok ? (mediaData.results || []) : [];
        }
    } catch (error) {
        console.error("Failed to fetch category data:", error);
    }

    if (!category) {
        return (
            <div className="min-h-screen py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Link href="/categories" className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors mb-6">
                        <ChevronLeft className="h-4 w-4" />
                        {t('category_back')}
                    </Link>
                    <div className="bg-destructive/15 border border-destructive rounded-lg p-4">
                        <p className="text-destructive">{t('category_not_found')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link href="/categories" className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors mb-6">
                    <ChevronLeft className="h-4 w-4" />
                    {t('category_back')}
                </Link>

                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
                        <Badge variant="secondary">
                            {media.length} photo{media.length !== 1 ? 's' : ''}
                        </Badge>
                    </div>
                    {category.description && (
                        <p className="text-muted-foreground">{category.description}</p>
                    )}
                </div>

                {media.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">{t('category_no_photos')}</p>
                    </div>
                ) : (
                    <CategoryDetailClient categorySlug={slug} initialMedia={media} />
                )}
            </div>
        </div>
    );
}
