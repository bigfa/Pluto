'use client';

import { useState, useEffect } from 'react';
import { subscribe, checkSubscriptionEnabled } from '@/lib/api';
import { Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SubscriptionForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [enabled, setEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        checkSubscriptionEnabled().then(setEnabled);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setErrorMessage('');

        try {
            const res = await subscribe(email);
            if (res.ok) {
                setStatus('success');
                setEmail('');
            }
        } catch (error) {
            console.error('Subscription failed:', error);
            setStatus('error');
            setErrorMessage('Failed to subscribe. Please try again.');
        } finally {
            if (status !== 'success') {
                // If success, we keep it in success state
                // Only reset loading if failed
            }
        }
    };

    // Don't render if subscription is not enabled or still checking
    if (enabled === null || enabled === false) {
        return null;
    }

    if (status === 'success') {
        return (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">Subscribed successfully!</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <div className="flex flex-col gap-2">
                <div className="relative flex items-center">
                    <div className="absolute left-3 text-muted-foreground">
                        <Mail size={16} />
                    </div>
                    <input
                        type="email"
                        placeholder="Subscribe to newsletter"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-24 py-2 rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                        disabled={status === 'loading'}
                        required
                    />
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="absolute right-1 top-1 bottom-1 px-3 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        {status === 'loading' ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            'Subscribe'
                        )}
                    </button>
                </div>
                {status === 'error' && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 ml-1">
                        <AlertCircle size={12} />
                        <span>{errorMessage}</span>
                    </div>
                )}
            </div>
        </form>
    );
}
