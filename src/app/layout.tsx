import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { site } from "@/lib/site";
import { jsonLdString, websiteJsonLd } from "@/lib/jsonld";

// To match your current site's font, swap this import and the variable name in tokens.css (--font-sans).
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans", display: "swap" });

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
  // Session 7: add verification: { google: "<search-console-token>" }
};

export const viewport: Viewport = { themeColor: "#1F7A4D", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE" className={sans.variable}>
      <body>
        <a href="#main" className="skipLink">Skip to content</a>
        <Providers>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <BottomNav />
        </Providers>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd) }} />
      </body>
    </html>
  );
}
