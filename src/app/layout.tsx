import type { Metadata } from "next";
import "./globals.scss";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: SITE_CONFIG.siteInfo.title,
  description: SITE_CONFIG.siteInfo.description,
  keywords: ["photography", "portfolio", "photos", "gallery"],
  openGraph: {
    title: SITE_CONFIG.siteInfo.title,
    description: SITE_CONFIG.siteInfo.description,
    url: SITE_CONFIG.siteInfo.url,
    siteName: SITE_CONFIG.siteInfo.name,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.siteInfo.title,
    description: SITE_CONFIG.siteInfo.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
