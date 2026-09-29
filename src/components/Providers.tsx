"use client";
import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { WishlistProvider } from "@/lib/wishlist";
import OfflineBanner from "./OfflineBanner";
import PwaRegister from "./PwaRegister";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <WishlistProvider>
        {children}
        <OfflineBanner />
        <PwaRegister />
      </WishlistProvider>
    </MotionConfig>
  );
}
