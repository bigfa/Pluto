const envValue = (value?: string) =>
    value && value.trim().length > 0 ? value.trim() : undefined;

const envNumber = (value?: string) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const envBoolean = (value?: string) => {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return undefined;
};

const envJson = <T>(value?: string) => {
    if (!value) return undefined;
    try {
        return JSON.parse(value) as T;
    } catch {
        return undefined;
    }
};

const envCsv = (value?: string) => {
    if (!value) return undefined;
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

type NavLink = { href: string; label: string; labelKey?: string };

export const SITE_CONFIG = {
    // Site Branding
    siteInfo: {
        name: envValue(process.env.NEXT_PUBLIC_SITE_NAME) || "Pluto",
        logo: envValue(process.env.NEXT_PUBLIC_SITE_LOGO) || "📷",
        title:
            envValue(process.env.NEXT_PUBLIC_SITE_TITLE) ||
            "Pluto - Personal Photo Gallery",
        description:
            envValue(process.env.NEXT_PUBLIC_SITE_DESCRIPTION) ||
            "A personal photo gallery showcasing favorite moments.",
        url:
            envValue(process.env.NEXT_PUBLIC_SITE_URL) || "https://example.com",
    },

    // i18n
    i18n: {
        defaultLocale: envValue(process.env.NEXT_PUBLIC_DEFAULT_LOCALE) || "en",
        locales: envCsv(process.env.NEXT_PUBLIC_LOCALES) || ["en", "zh"],
        timeZone: envValue(process.env.NEXT_PUBLIC_TIMEZONE),
    },

    // Navigation Menu
    navLinks: envJson<NavLink[]>(process.env.NEXT_PUBLIC_NAV_LINKS) || [
        { href: "/", label: "Home", labelKey: "nav_home" },
        { href: "/albums", label: "Albums", labelKey: "nav_albums" },
        {
            href: "/categories",
            label: "Categories",
            labelKey: "nav_categories",
        },
        { href: "/about", label: "About", labelKey: "nav_about" },
    ],

    // Home Grid Masonry Columns Configuration
    // Breakpoints match Tailwind: sm: 640, md: 768, lg: 1024, xl: 1280
    masonryColumns: envJson<{
        default: number;
        xl: number;
        lg: number;
        md: number;
        sm: number;
    }>(process.env.NEXT_PUBLIC_MASONRY_COLUMNS) || {
        default: 4, // >= 1280px
        xl: 4, // >= 1280px (explicit)
        lg: 3, // < 1280px
        md: 2, // < 960px (custom breakpoint in MediaGrid)
        sm: 1, // < 640px
    },

    // Frontend Photo Grid Spacing
    mediaGap: {
        desktop: envValue(process.env.NEXT_PUBLIC_MEDIA_GAP) || "1rem",
        mobile: envValue(process.env.NEXT_PUBLIC_MEDIA_GAP_MOBILE) || "0.75rem",
    },

    // Pagination
    pageSize: envNumber(process.env.NEXT_PUBLIC_PAGE_SIZE) || 20,

    // Feature Flags
    features: {
        enableFilters:
            envBoolean(process.env.NEXT_PUBLIC_ENABLE_FILTERS) ?? true, // Show Sort/Orientation/Category filters
        enableLikes: envBoolean(process.env.NEXT_PUBLIC_ENABLE_LIKES) ?? true, // Enable Like button functionality
        enableNewsletter:
            envBoolean(process.env.NEXT_PUBLIC_ENABLE_NEWSLETTER) ?? true, // Enable newsletter subscription form in footer
        enableFooterMenu:
            envBoolean(process.env.NEXT_PUBLIC_ENABLE_FOOTER_MENU) ?? true, // Enable footer links (Privacy, Terms)
    },
};
