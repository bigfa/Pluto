import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function encodeForHTML(str: string) {
    return ("" + str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
}

/**
 * Get the API base URL for server-side and client-side fetch requests.
 * - Uses NEXT_PUBLIC_API_BASE_URL if set (external API)
 * - Falls back to NEXT_PUBLIC_BASE_URL + /api for internal routes
 * - Falls back to /api for client-side relative URLs
 */
export function getApiBaseUrl(): string {
    // If external API is configured, use it
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    // For server-side rendering, construct full URL
    // prioritizing the public domain variable or hardcoded fallback
    if (typeof window === 'undefined') {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
        return `${baseUrl}/api`;
    }
    // Client-side can use relative URLs
    return '/api';
}
