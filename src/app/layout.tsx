import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import SiteChrome from "@/components/SiteChrome";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import Analytics from "@/components/Analytics";
import { site } from "@/lib/site";
import { jsonLdString, websiteJsonLd } from "@/lib/jsonld";
import { createPublicClient } from "@/lib/supabase/public";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-plex-mono", display: "swap" });

const title = `${site.name} | Shop verified businesses across Kenya`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: site.name, locale: site.locale, url: site.url, title, description: site.description },
  twitter: { card: "summary_large_image", title, description: site.description },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
};

export const viewport: Viewport = { themeColor: "#1F7A4D", width: "device-width", initialScale: 1, viewportFit: "cover" };

// Categories with their subcategories, for the header menu, sidebar and filters.
async function getCategoriesLite() {
  const db = createPublicClient();
  const [{ data: cats }, { data: subs }] = await Promise.all([
    db.from("categories").select("id, slug, name, icon").eq("active", true).order("sort_order"),
    db.from("subcategories").select("slug, name, category_id").eq("active", true).order("sort_order"),
  ]);
  return (cats ?? []).map((c) => ({ ...c, subs: (subs ?? []).filter((s) => s.category_id === c.id).map(({ slug, name }) => ({ slug, name })) }));
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategoriesLite();
  return (
    <html lang="en-KE" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="visually-hidden">Skip to content</a>
        <Providers categories={categories}>
          <SiteChrome header={<Header />} footer={<Footer />} bottomNav={<BottomNav />}>
            {children}
          </SiteChrome>
        </Providers>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd) }} />
        <Analytics />
      </body>
    </html>
  );
}
