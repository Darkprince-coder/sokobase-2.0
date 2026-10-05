import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import ProductSection from "@/components/ProductSection";
import { getProductBySlug, getSimilarProducts } from "@/lib/catalog";
import { site } from "@/lib/site";
import { jsonLdString } from "@/lib/jsonld";
import { formatPrice } from "@/lib/format";

// Safety net: server actions revalidate these pages on every change; this catches anything missed.
export const revalidate = 300;

// Render each page on its first visit, then serve it from cache until revalidated (ISR).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  const priceText = formatPrice(product.price, product.priceType);
  const title = product.priceType === "contact" ? product.name : `${product.name} - ${priceText}`;
  const description = product.description?.slice(0, 155) ?? `${product.name} from ${product.business}, ${product.location}. ${priceText}. Order on WhatsApp.`;
  return {
    title, description, alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description, images: product.imageUrl ? [product.imageUrl] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const similar = await getSimilarProducts(product.categoryId, product.id, 8);

  // Google requires a price on an Offer, so "ask for price" products are described without one.
  const variantPrices = product.variants.map((v) => v.price).filter((p): p is number => p != null);
  const prices = variantPrices.length ? variantPrices : product.price != null ? [product.price] : [];
  const availability = product.inStock && (product.variants.length === 0 || product.variants.some((v) => v.inStock))
    ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const seller = { "@type": "Organization", name: product.business, url: `${site.url}/store/${product.businessSlug}` };
  const url = `${site.url}/products/${product.slug}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: product.name,
    image: product.images, description: product.description ?? undefined, category: product.category || undefined,
    offers: product.priceType === "contact" || prices.length === 0 ? undefined
      : prices.length > 1
        ? { "@type": "AggregateOffer", priceCurrency: "KES", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability, url, seller }
        : { "@type": "Offer", priceCurrency: "KES", price: prices[0], availability, url, seller },
  };

  return (
    <div className="container" style={{ paddingTop: 18 }}>
      <ProductDetail product={product} />
      {similar.length > 0 && <ProductSection title="Similar products" href="/products" products={similar} layout="rail" />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
    </div>
  );
}
