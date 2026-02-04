import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import MarkdownContent from '@/components/MarkdownContent';
import privacyContent from '@/content/privacy.md';

export const metadata: Metadata = {
    title: `Privacy Policy | ${SITE_CONFIG.siteInfo.name}`,
    description: `Privacy Policy for ${SITE_CONFIG.siteInfo.name} website`,
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <MarkdownContent content={privacyContent} />
            </div>
        </div>
    );
}
