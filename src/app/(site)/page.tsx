import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import { SITE_CONFIG } from '@/config/site';
import { getEnv } from '@/lib/env';
import { listMedia } from '@/services/mediaServices';
import type { Media } from '@/types/media';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: SITE_CONFIG.siteInfo.title,
  description: SITE_CONFIG.siteInfo.description,
  openGraph: {
    title: SITE_CONFIG.siteInfo.title,
    description: SITE_CONFIG.siteInfo.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_CONFIG.siteInfo.title,
    description: SITE_CONFIG.siteInfo.description,
  },
};

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const pageSize = SITE_CONFIG.pageSize;

  let initialMedia: Media[] = [];
  let initialTotal = 0;
  let initialLoaded = false;

  try {
    const env = await getEnv();
    const response = await listMedia(env, {
      page: 1,
      pageSize,
      category: category || undefined,
      sort: 'date',
    });

    if (response.ok) {
      const cookieStore = await cookies();
      const isLikedByCookie = (id: string) => {
        const value = cookieStore.get(`media_like_${id}`)?.value;
        return value === '1' || value === 'true';
      };

      initialMedia = (response.results || []).map((item) => ({
        ...item,
        liked: isLikedByCookie(item.id),
      }));
      initialTotal = response.total || 0;
      initialLoaded = true;
    }
  } catch (error) {
    console.error('Failed to prefetch media list:', error);
  }

  return (
    <HomeClient
      initialMedia={initialMedia}
      initialTotal={initialTotal}
      initialPage={1}
      initialPageSize={pageSize}
      initialCategory={category}
      initialLoaded={initialLoaded}
    />
  );
}
