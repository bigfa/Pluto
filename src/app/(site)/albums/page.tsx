import type { Metadata } from 'next';
import AlbumsClient from './AlbumsClient';
import { SITE_CONFIG } from '@/config/site';
import { getEnv } from '@/lib/env';
import { listAlbums } from '@/services/albumServices';
import type { Album } from '@/types/album';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: `${t('albums_title')} | ${SITE_CONFIG.siteInfo.name}`,
    description: t('albums_subtitle'),
    openGraph: {
        title: `${t('albums_title')} | ${SITE_CONFIG.siteInfo.name}`,
        description: t('albums_subtitle'),
    },
};

export default async function AlbumsPage() {
    const pageSize = 20;
    let initialAlbums: Album[] = [];
    let initialTotal = 0;
    let initialLoaded = false;

    try {
        const env = await getEnv();
        const response = await listAlbums(env, { page: 1, pageSize });
        if (response.ok) {
            initialAlbums = response.albums || [];
            initialTotal = response.total || 0;
            initialLoaded = true;
        }
    } catch (error) {
        console.error('Failed to prefetch albums list:', error);
    }

    return (
        <AlbumsClient
            initialAlbums={initialAlbums}
            initialTotal={initialTotal}
            initialPage={1}
            initialPageSize={pageSize}
            initialLoaded={initialLoaded}
        />
    );
}
