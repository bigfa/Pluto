'use client';

import { useState } from 'react';
import Link from 'next/link';

import { SITE_CONFIG } from '@/config/site';
import SubscriptionForm from './SubscriptionForm';

export default function Footer() {
    const [currentYear] = useState<number>(new Date().getFullYear());
    const { enableNewsletter, enableFooterMenu } = SITE_CONFIG.features;

    return (
        <footer className="mt-auto text-foreground/80 bg-white border-t border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-6">
                            <p className="text-sm text-muted-foreground">
                                © {currentYear ?? '2026'} {SITE_CONFIG.siteInfo.name}. All rights reserved.
                            </p>
                            {enableFooterMenu && (
                                <>
                                    <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        Privacy
                                    </Link>
                                    <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        Terms
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-start md:justify-end">
                        {enableNewsletter && <SubscriptionForm />}
                    </div>
                </div>
            </div>
        </footer>
    );
}
