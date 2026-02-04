import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { getEnv } from '@/lib/env';
import { getAlbumById } from '@/services/albumServices';

interface LayoutProps {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
    const { id } = await params;

    if (!id) return { title: 'Album Not Found' };

    try {
        const env = await getEnv();
        const response = await getAlbumById(env, id);
        if (response.ok && response.data) {
            return {
                title: `${response.data.title} | ${SITE_CONFIG.siteInfo.name}`,
                description: response.data.description || `View photos from ${response.data.title}`,
                openGraph: {
                    title: `${response.data.title} | ${SITE_CONFIG.siteInfo.name}`,
                    description: response.data.description || `View photos from ${response.data.title}`,
                    images: response.data.cover_media?.url ? [{
                        url: response.data.cover_media.url_medium || response.data.cover_media.url,
                        alt: response.data.title
                    }] : [],
                },
                twitter: {
                    card: 'summary_large_image',
                    title: `${response.data.title} | ${SITE_CONFIG.siteInfo.name}`,
                    description: response.data.description || `View photos from ${response.data.title}`,
                    images: response.data.cover_media?.url ? [response.data.cover_media.url_medium || response.data.cover_media.url] : [],
                },
            };
        }
    } catch (error) {
        console.error('Error generating metadata for album:', error);
    }

    return {
        title: 'Album Not Found',
        description: 'The requested album could not be found.',
    };
}

export default function AlbumLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
