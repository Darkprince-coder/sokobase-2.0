import type { PriceType } from "./types";

export const formatKes = (amount: number) => `KSh ${amount.toLocaleString("en-KE")}`;

// "Ask for price" products have no price; "from" products show a starting price.
export const formatPrice = (price: number | null | undefined, priceType: PriceType = "fixed") => {
  if (priceType === "contact" || price == null) return "Ask for price";
  return priceType === "from" ? `From ${formatKes(price)}` : formatKes(price);
};

export const discountPercent = (price: number | null | undefined, oldPrice?: number | null) =>
  price != null && oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
