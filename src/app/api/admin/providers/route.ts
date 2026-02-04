import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();

    const providers = [
        {
            value: 'local',
            label: 'Local (Disk)',
            available: !!(env.MEDIA_LOCAL_DIR || env.MEDIA_LOCAL_PUBLIC_URL),
        },
        {
            value: 'r2',
            label: 'R2',
            available: !!env.MEDIA_BUCKET,
        },
        {
            value: 'upyun',
            label: '又拍云',
            available: !!(env.UPYUN_BUCKET && env.UPYUN_OPERATOR && env.UPYUN_PASSWORD),
        },
        {
            value: 'cos',
            label: '腾讯云 COS',
            available: !!(env.COS_SECRET_ID && env.COS_SECRET_KEY && env.COS_BUCKET && env.COS_REGION),
        },
    ];

    const defaultProvider = env.MEDIA_DEFAULT_PROVIDER || providers.find(p => p.available)?.value || 'r2';

    return NextResponse.json({ ok: true, providers, defaultProvider });
}
