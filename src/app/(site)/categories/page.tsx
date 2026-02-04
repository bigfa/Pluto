import type { Metadata } from 'next';
import CategoriesClient from './CategoriesClient';
import { SITE_CONFIG } from '@/config/site';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
    title: `${t('categories_title')} | ${SITE_CONFIG.siteInfo.name}`,
    description: t('categories_subtitle'),
    openGraph: {
        title: `${t('categories_title')} | ${SITE_CONFIG.siteInfo.name}`,
        description: t('categories_subtitle'),
    },
};

export default function CategoriesPage() {
    return <CategoriesClient />;
}
