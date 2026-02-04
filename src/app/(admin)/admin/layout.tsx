'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { checkAuth, logout } from '@/lib/admin/api';
import { cn } from '@/lib/utils';
import { SITE_CONFIG } from '@/config/site';
import { t } from '@/lib/i18n';
import { Home, Image, FolderOpen, MessageSquare, LogOut, Menu, X, Mail, Users } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const navItems = [
        { href: '/', label: t('nav_home'), icon: Home, target: '_blank', rel: 'noopener noreferrer' },
        { href: '/admin/media', label: t('admin_nav_media'), icon: Image },
        { href: '/admin/albums', label: t('admin_nav_albums'), icon: FolderOpen },
        { href: '/admin/comments', label: t('admin_nav_comments'), icon: MessageSquare },
        { href: '/admin/newsletters', label: t('admin_nav_newsletters'), icon: Mail },
        { href: '/admin/subscribers', label: t('admin_nav_subscribers'), icon: Users },
    ];
    const pathname = usePathname();
    const [user, setUser] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkAuth().then((res) => {
            const currentUser = res?.user || null;
            setUser(currentUser);
            setLoading(false);

            const isLoginPage = pathname?.startsWith('/admin/login');
            if (!currentUser && !isLoginPage) {
                router.push('/admin/login');
            } else if (currentUser && isLoginPage) {
                router.push('/admin/media');
            }
        });
    }, [pathname, router]);

    const handleLogout = async () => {
        await logout();
        window.location.href = '/admin/login';
    };

    if (pathname?.startsWith('/admin/login')) {
        if (loading) return null;
        return <main>{children}</main>;
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-muted-foreground">{t('common_loading')}</div>
            </div>
        );
    }

    if (!user) return null;

    const normalizedPathname = (pathname || '').replace(/\/+$/, '') || '/';

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-14 items-center px-4 sm:px-6">
                    <div className="mr-4 flex">
                        <Link href="/admin/media" className="mr-6 flex items-center space-x-2">
                            <span className="font-bold">{SITE_CONFIG.siteInfo.name} {t('admin_brand_suffix')}</span>
                        </Link>
                    </div>
                    <nav className="hidden md:flex flex-1 items-center space-x-6 text-sm font-medium">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const normalizedHref = item.href === '/' ? '/' : item.href.replace(/\/+$/, '');
                            const isActive = item.href === '/'
                                ? normalizedPathname === '/'
                                : normalizedPathname.startsWith(normalizedHref);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    target={item.target}
                                    rel={item.rel}
                                    className={cn('flex items-center space-x-1 transition-colors hover:text-foreground/80',
                                        isActive ? 'text-foreground' : 'text-foreground/60')}>
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="hidden md:flex items-center space-x-4">
                        <span className="text-sm text-muted-foreground">{user}</span>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut className="h-4 w-4 mr-1" /> {t('admin_logout')}
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="md:hidden ml-auto"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>
                {mobileMenuOpen && (
                    <div className="md:hidden border-t">
                        <nav className="container mx-auto py-4 space-y-2 px-4 sm:px-6">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const normalizedHref = item.href === '/' ? '/' : item.href.replace(/\/+$/, '');
                                const isActive = item.href === '/'
                                    ? normalizedPathname === '/'
                                    : normalizedPathname.startsWith(normalizedHref);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        target={item.target}
                                        rel={item.rel}
                                        className={cn('flex items-center space-x-2 py-2 px-3 rounded-md transition-colors',
                                            isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent')}
                                        onClick={() => setMobileMenuOpen(false)}>
                                        <Icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                            <div className="pt-4 border-t mt-4">
                                <div className="px-3 py-2 text-sm text-muted-foreground">{user}</div>
                                <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                                    <LogOut className="h-4 w-4 mr-2" /> {t('admin_logout')}
                                </Button>
                            </div>
                        </nav>
                    </div>
                )}
            </header>
            <main className="container mx-auto py-6 px-4 sm:px-6">{children}</main>
            <Toaster />
        </div>
    );
}
