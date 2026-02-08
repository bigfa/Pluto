'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Media, MediaListParams, MediaListResponse } from '@/types/media';
import { fetchMediaList } from '@/lib/api';

import { SITE_CONFIG } from '@/config/site';

interface UseMediaListReturn {
    media: Media[];
    loading: boolean;
    error: Error | null;
    total: number;
    page: number;
    pageSize: number;
    setParams: (params: MediaListParams) => void;
    refetch: () => void;
    updateMedia: (id: string, updates: Partial<Media>) => void;
    hasMore: boolean;
    sort: 'date' | 'likes' | 'views';
    orientation?: 'landscape' | 'portrait' | 'square';
}

type InitialMediaData = {
    media: Media[];
    total: number;
    page?: number;
    pageSize?: number;
    sort?: 'date' | 'likes' | 'views';
    orientation?: 'landscape' | 'portrait' | 'square';
};

const shallowEqualParams = (a: MediaListParams, b: MediaListParams) => {
    return a.q === b.q
        && a.category === b.category
        && a.tag === b.tag
        && a.page === b.page
        && a.pageSize === b.pageSize
        && a.sort === b.sort
        && a.orientation === b.orientation
        && a.provider === b.provider
        && a.folder === b.folder
        && a.make === b.make
        && a.model === b.model
        && a.createdFrom === b.createdFrom
        && a.createdTo === b.createdTo;
};

export function useMediaList(initialParams: MediaListParams = {}, initialData?: InitialMediaData): UseMediaListReturn {
    const [params, setParams] = useState<MediaListParams>({
        page: 1,
        pageSize: SITE_CONFIG.pageSize,
        ...initialParams,
    });
    const [media, setMedia] = useState<Media[]>(initialData?.media || []);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<Error | null>(null);
    const [total, setTotal] = useState(initialData?.total || 0);
    const initialParamsRef = useRef(params);
    const hasInitialRef = useRef(!!initialData);

    const fetchData = useCallback(async () => {
        if (hasInitialRef.current && shallowEqualParams(params, initialParamsRef.current)) {
            hasInitialRef.current = false;
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const response: MediaListResponse = await fetchMediaList(params);

            if (response.ok) {
                setMedia(prev => {
                    const newMedia = response.results || [];
                    if (params.page === 1) {
                        return newMedia;
                    }
                    // Filter out duplicates to be safe, though API shouldn't return them if pagination is correct
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNewMedia = newMedia.filter(m => !existingIds.has(m.id));
                    return [...prev, ...uniqueNewMedia];
                });
                setTotal(response.total || 0);
            } else {
                throw new Error('API returned unsuccessful response');
            }
        } catch (err) {
            console.error('API Error:', err);
            setError(err instanceof Error ? err : new Error('Unknown error occurred'));
            // Keep existing media on error during load more, but clear if it's first page
            if (params.page === 1) {
                setMedia([]);
            }
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateParams = useCallback((newParams: MediaListParams) => {
        setLoading(true);
        setParams(prev => ({ ...prev, ...newParams }));
    }, []);

    const updateMedia = useCallback((id: string, updates: Partial<Media>) => {
        setMedia(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    }, []);

    const hasMore = media.length < total;

    return {
        media,
        loading,
        error,
        total,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        setParams: updateParams,
        refetch: fetchData,
        updateMedia,
        hasMore,
        sort: params.sort || 'date',
        orientation: params.orientation,
    };
}
