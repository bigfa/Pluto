import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getMediaViewCount, incrementMediaView, isBot } from "@/services/mediaViewServices";

function getClientIp(request: NextRequest): string {
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp;

    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        const [firstIp] = forwarded.split(",");
        if (firstIp?.trim()) return firstIp.trim();
    }

    return "127.0.0.1";
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const env = await getEnv();
    const views = await getMediaViewCount(env, id);
    return NextResponse.json({ ok: true, views });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const env = await getEnv();
    const userAgent = request.headers.get("user-agent") || "";

    if (isBot(userAgent)) {
        const views = await getMediaViewCount(env, id);
        return NextResponse.json({ ok: true, views, skipped: true });
    }

    const ip = getClientIp(request);
    const result = await incrementMediaView(env, id, ip);

    if (!result.success) {
        return NextResponse.json(
            { ok: false, error: result.error || "Failed to record view" },
            { status: 500 },
        );
    }

    return NextResponse.json({ ok: true, views: result.views });
}
