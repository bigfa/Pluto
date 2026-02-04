import { getEnv } from '@/lib/env';
import { unsubscribe } from '@/services/subscriberServices';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PageProps {
    searchParams: Promise<{ token?: string }>;
}

export const metadata = {
    title: 'Unsubscribe',
};

export default async function UnsubscribePage({ searchParams }: PageProps) {
    const { token } = await searchParams;

    let success = false;
    let error = '';

    if (token) {
        try {
            const env = await getEnv();
            success = await unsubscribe(env, token);
            if (!success) {
                error = 'Invalid or expired unsubscribe link.';
            }
        } catch (e) {
            console.error('Unsubscribe error:', e);
            error = 'An error occurred while processing your request.';
        }
    } else {
        error = 'Invalid unsubscribe link.';
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {success ? (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold">Unsubscribed Successfully</h1>
                        <p className="text-muted-foreground">
                            You have been removed from our mailing list. You will no longer receive emails from us.
                        </p>
                        <Link
                            href="/"
                            className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                            Back to Home
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <XCircle className="h-16 w-16 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold">Unsubscribe Failed</h1>
                        <p className="text-muted-foreground">{error}</p>
                        <Link
                            href="/"
                            className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                            Back to Home
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
