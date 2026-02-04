import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
    title: `${SITE_CONFIG.siteInfo.name} ${t('admin_brand_suffix')}`,
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return children;
}
