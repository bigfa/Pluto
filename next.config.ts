import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

const envRemotePatterns = (): RemotePattern[] => {
    const candidates = [
        process.env.NEXT_PUBLIC_BASE_URL,
        process.env.NEXT_PUBLIC_API_BASE_URL,
        process.env.R2_DOMAIN,
        process.env.MEDIA_DOMAIN,
        process.env.UPYUN_DOMAIN,
        process.env.COS_DOMAIN,
    ]
        .map((value) => (value || '').trim())
        .filter(Boolean);

    const patterns: RemotePattern[] = [];

    for (const value of candidates) {
        try {
            const url = new URL(value.includes('://') ? value : `https://${value}`);
            const protocol = url.protocol.replace(':', '');
            const pattern: RemotePattern = {
                hostname: url.hostname,
            };
            if (protocol === 'http' || protocol === 'https') {
                pattern.protocol = protocol;
            }
            patterns.push(pattern);
        } catch {
            // Ignore invalid URLs
        }
    }

    const unique = new Map<string, RemotePattern>();
    for (const pattern of patterns) {
        const key = `${pattern.protocol || 'any'}://${pattern.hostname}`;
        unique.set(key, pattern);
    }

    if (unique.size === 0) {
        // Fallback: allow all remote images if no domains are configured at build time.
        unique.set('any://**', { hostname: '**' });
    }

    return Array.from(unique.values());
};

// initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
    images: {
        unoptimized: true,
        remotePatterns: envRemotePatterns(),
    },
    async rewrites() {
        return [
            {
                source: '/api/subscribe',
                destination: 'https://misc.wpista.com/api/subscribe',
            },
        ];
    },
    webpack: (config) => {
        config.module.rules.push({
            test: /\.md$/,
            type: 'asset/source',
        });
        return config;
    },
};

export default nextConfig;
