// Sample data for Session 1 only. Replaced by Supabase queries in Sessions 5-6.
import type { Product, Shop } from "./types";

const P = (id: string, name: string, price: number, oldPrice: number | null, badge: Product["badge"], business: string, location: string, category: string): Product => ({
  id, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, price, oldPrice, badge, business, location, category, imageUrl: null, whatsapp: "254700000000",
});

export const mockProducts: Product[] = [
  P("1", "Samsung Galaxy A15 128GB", 18500, 21000, "hot", "Ezekii Electronics", "Nairobi", "Phones & Tablets"),
  P("2", "Wireless Bluetooth Headphones", 3200, 4500, "offer", "Nairobi Gadgets", "Nairobi", "Electronics"),
  P("3", "Non-stick Cookware Set, 7 pieces", 6800, 8500, "offer", "Kaya Homeware", "Nakuru", "Home & Kitchen"),
  P("4", "Men's Running Sneakers", 4200, 5500, "hot", "Stride Kenya", "Mombasa", "Fashion"),
  P("5", "Shea Butter Body Lotion 400ml", 950, null, "new", "Glow Naturals", "Kisumu", "Beauty & Personal Care"),
  P("6", "Smart Watch Series 6", 4500, 6000, "hot", "Ezekii Electronics", "Nairobi", "Electronics"),
  P("7", "Queen Size Cotton Bedding Set", 5400, null, "new", "Home Comforts", "Eldoret", "Home & Kitchen"),
  P("8", "Kids Backpack, 18 inch", 1600, 2000, "offer", "Little Steps", "Thika", "Baby & Kids"),
  P("9", "Portable Blender 600ml", 2100, null, "new", "Kaya Homeware", "Nakuru", "Home & Kitchen"),
  P("10", "HP 15 Laptop, 8GB RAM 256GB SSD", 65000, 72000, "hot", "Kimana Computers", "Nairobi", "Electronics"),
  P("11", "Ladies Leather Handbag", 2800, null, null, "Zawadi Fashions", "Mombasa", "Fashion"),
  P("12", "Phone Screen Repair (visit)", 1500, null, null, "FixIt Kisumu", "Kisumu", "Services"),
];

export const mockShops: Shop[] = [
  { id: "1", slug: "ezekii-electronics", name: "Ezekii Electronics", location: "Nairobi", category: "Electronics", products: 24, verified: true },
  { id: "2", slug: "kaya-homeware", name: "Kaya Homeware", location: "Nakuru", category: "Home & Kitchen", products: 58, verified: true },
  { id: "3", slug: "glow-naturals", name: "Glow Naturals", location: "Kisumu", category: "Beauty", products: 31, verified: true },
  { id: "4", slug: "stride-kenya", name: "Stride Kenya", location: "Mombasa", category: "Fashion", products: 76, verified: true },
];
