import { Smartphone, Laptop, Shirt, Sofa, Sparkles, ShoppingBasket, Dumbbell, Car, Wrench, Baby } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Category = { slug: string; label: string; Icon: LucideIcon };

// Temporary list. Becomes DB-driven (categories table, managed in admin) in Session 3.
export const categories: Category[] = [
  { slug: "phones-tablets", label: "Phones & Tablets", Icon: Smartphone },
  { slug: "electronics", label: "Electronics", Icon: Laptop },
  { slug: "fashion", label: "Fashion", Icon: Shirt },
  { slug: "home-kitchen", label: "Home & Kitchen", Icon: Sofa },
  { slug: "beauty", label: "Beauty & Personal Care", Icon: Sparkles },
  { slug: "groceries", label: "Groceries", Icon: ShoppingBasket },
  { slug: "baby-kids", label: "Baby & Kids", Icon: Baby },
  { slug: "sports", label: "Sports & Outdoors", Icon: Dumbbell },
  { slug: "automotive", label: "Automotive", Icon: Car },
  { slug: "services", label: "Services", Icon: Wrench },
];
