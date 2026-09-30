"use client";
import { Suspense, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { WishlistProvider } from "@/lib/wishlist";
import { CategoriesProvider, type CategoryLite } from "@/lib/categories-context";
import OfflineBanner from "./OfflineBanner";
import PwaRegister from "./PwaRegister";
import PageProgress from "./PageProgress";

export default function Providers({ categories, children }: { categories: CategoryLite[]; children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <CategoriesProvider categories={categories}>
        <WishlistProvider>
          <Suspense fallback={null}><PageProgress /></Suspense>
          {children}
          <OfflineBanner />
          <PwaRegister />
        </WishlistProvider>
      </CategoriesProvider>
    </MotionConfig>
  );
}
