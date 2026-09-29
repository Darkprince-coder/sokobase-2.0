export const formatKes = (amount: number) => `KSh ${amount.toLocaleString("en-KE")}`;

export const discountPercent = (price: number, oldPrice?: number | null) =>
  oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
