import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import MarkdownContent from '@/components/MarkdownContent';
import termsContent from '@/content/terms.md';

export const metadata: Metadata = {
    title: `Terms of Service | ${SITE_CONFIG.siteInfo.name}`,
    description: `Terms of Service for ${SITE_CONFIG.siteInfo.name} website`,
};

export default function TermsPage() {
    return (
        <div className="min-h-screen py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <MarkdownContent content={termsContent} />
            </div>
        </div>
    );
}
