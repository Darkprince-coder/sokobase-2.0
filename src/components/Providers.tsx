"use client";
import { Suspense, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { WishlistProvider } from "@/lib/wishlist";
import OfflineBanner from "./OfflineBanner";
import PwaRegister from "./PwaRegister";
import PageProgress from "./PageProgress";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <WishlistProvider>
        <Suspense fallback={null}><PageProgress /></Suspense>
        {children}
        <OfflineBanner />
        <PwaRegister />
      </WishlistProvider>
    </MotionConfig>
  );
}
