"use client";
import { Smartphone, Laptop, Shirt, Sofa, Sparkles, ShoppingBasket, Baby, Dumbbell, Car, Wrench, Store, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  smartphone: Smartphone, laptop: Laptop, shirt: Shirt, sofa: Sofa, sparkles: Sparkles,
  "shopping-basket": ShoppingBasket, baby: Baby, dumbbell: Dumbbell, car: Car, wrench: Wrench,
};

// Category icons are stored as a lucide name string (set in Admin > Categories). Unknown or
// empty names fall back to a plain shop icon rather than breaking the page.
export function CategoryIcon({ name, size = 20 }: { name?: string | null; size?: number }) {
  const Icon = (name && MAP[name]) || Store;
  return <Icon size={size} aria-hidden="true" />;
}
