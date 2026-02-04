'use client';

import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverProps {
    threshold?: number;
    root?: Element | null;
    rootMargin?: string;
    onIntersect?: () => void;
    enabled?: boolean;
}

export function useIntersectionObserver({
    threshold = 0,
    root = null,
    rootMargin = '0px',
    onIntersect,
    enabled = true,
}: UseIntersectionObserverProps) {
    const elementRef = useRef<HTMLDivElement | null>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        if (!enabled || !elementRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
                if (entry.isIntersecting && onIntersect) {
                    onIntersect();
                }
            },
            { threshold, root, rootMargin }
        );

        observer.observe(elementRef.current);

        return () => {
            observer.disconnect();
        };
    }, [threshold, root, rootMargin, onIntersect, enabled]);

    return { ref: elementRef, isIntersecting };
}
