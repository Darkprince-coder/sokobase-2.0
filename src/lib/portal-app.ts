import type { Metadata, Viewport } from "next";

// "SokoBase Biz": the installable app for shop owners. The portal (portal.sokobase.co.ke) is its own
// origin, so it installs as a separate home-screen app that opens straight to the dashboard.
// Portal pages spread these into their metadata so they point at the business manifest and icon.
export const BIZ_APP_NAME = "SokoBase Biz";
export const BIZ_THEME = "#14201b"; // brand charcoal

export const portalAppMetadata: Pick<Metadata, "manifest" | "icons" | "appleWebApp"> = {
  manifest: "/biz.webmanifest",
  icons: { icon: "/biz-mark.svg", apple: "/icons/biz-apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BIZ_APP_NAME, statusBarStyle: "black" },
};

export const portalViewport: Viewport = { themeColor: BIZ_THEME };
