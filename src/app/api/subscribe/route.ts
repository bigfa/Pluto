import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { addSubscriber, isSubscriptionEnabled } from '@/services/subscriberServices';

export async function POST(request: NextRequest) {
    try {
        const env = await getEnv();

        // Check if subscription is enabled
        if (!isSubscriptionEnabled(env)) {
            return NextResponse.json(
                { ok: false, error: 'Subscription is not available' },
                { status: 503 }
            );
        }

        const body = await request.json() as { email?: string };
        const { email } = body;

        // Validate email
        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { ok: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { ok: false, error: 'Invalid email format' },
                { status: 400 }
            );
        }

        const result = await addSubscriber(env, email.toLowerCase().trim());

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, error: result.error || 'Failed to subscribe' },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, token: result.token });
    } catch (error) {
        console.error('Subscribe error:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET endpoint to check if subscription is enabled
export async function GET() {
    try {
        const env = await getEnv();
        const enabled = isSubscriptionEnabled(env);
        return NextResponse.json({ ok: true, enabled });
    } catch (error) {
        console.error('Check subscription error:', error);
        return NextResponse.json({ ok: true, enabled: false });
    }
}
