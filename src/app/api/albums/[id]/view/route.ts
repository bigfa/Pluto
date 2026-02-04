import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { getAlbumViewCount, incrementAlbumView } from '@/services/albumViewServices';

// Remove runtime = 'edge' to support DB connections

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const env = await getEnv();
    const count = await getAlbumViewCount(env, id);

    return NextResponse.json({ views: count });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const env = await getEnv();
    const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    const result = await incrementAlbumView(env, id, ip);

    if (!result.success) {
        const status = result.error?.includes('Too many') ? 429 : 400;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
}
