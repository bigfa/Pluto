'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { SITE_CONFIG } from '@/config/site';
import RssIcon from '@/components/RssIcon';
import { t, type MessageKey } from '@/lib/i18n';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    const routes = (SITE_CONFIG.navLinks as Array<{ href: string; label: string; labelKey?: MessageKey }>).map((route) => ({
        ...route,
        label: route.labelKey ? t(route.labelKey) : route.label,
    }));

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 font-semibold text-lg" onClick={closeMenu}>
                        <span className="text-2xl">{SITE_CONFIG.siteInfo.logo}</span>
                        <span>{SITE_CONFIG.siteInfo.name}</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        {routes.map((route) => (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === route.href ? 'text-primary' : 'text-muted-foreground'
                                    }`}
                            >
                                {route.label}
                            </Link>
                        ))}
                        <Link
                            href="/feed.xml"
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                            title={t('nav_rss')}
                            target="_blank"
                        >
                            <RssIcon size={16} />
                        </Link>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-muted-foreground hover:text-primary"
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isMenuOpen && (
                <div className="md:hidden border-t bg-background/95 backdrop-blur-md animate-in slide-in-from-top-5 fade-in-0">
                    <div className="px-4 py-4 space-y-4">
                        {routes.map((route) => (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={`block text-base font-medium transition-colors hover:text-primary ${pathname === route.href ? 'text-primary' : 'text-muted-foreground'
                                    }`}
                                onClick={closeMenu}
                            >
                                {route.label}
                            </Link>
                        ))}
                        <Link
                            href="/feed.xml"
                            className="flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-primary transition-colors"
                            title={t('nav_rss')}
                            target="_blank"
                            onClick={closeMenu}
                        >
                            <RssIcon size={16} />
                            <span>{t('nav_rss')}</span>
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
