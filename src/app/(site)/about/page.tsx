import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import MarkdownContent from '@/components/MarkdownContent';
import aboutContent from '@/content/about.md';

export const metadata: Metadata = {
    title: `About | ${SITE_CONFIG.siteInfo.name}`,
    description: `About ${SITE_CONFIG.siteInfo.name}`,
};

export default function AboutPage() {
    return (
        <div className="min-h-screen py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <MarkdownContent content={aboutContent} />
            </div>
        </div>
    );
}
