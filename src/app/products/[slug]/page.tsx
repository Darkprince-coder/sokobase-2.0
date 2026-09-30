import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import ProductSection from "@/components/ProductSection";
import { getProductBySlug, getSimilarProducts } from "@/lib/catalog";
import { site } from "@/lib/site";
import { jsonLdString } from "@/lib/jsonld";
import { formatKes } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  const title = `${product.name} - ${formatKes(product.price)}`;
  const description = product.description?.slice(0, 155) ?? `${product.name} from ${product.business}. ${formatKes(product.price)}.`;
  return {
    title, description, alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description, images: product.imageUrl ? [product.imageUrl] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const similar = await getSimilarProducts(product.categoryId, product.id, 8);

  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: product.name,
    image: product.images, description: product.description ?? undefined,
    offers: {
      "@type": "Offer", priceCurrency: "KES", price: product.price,
      availability: product.variants.length ? undefined : "https://schema.org/InStock",
      url: `${site.url}/products/${product.slug}`,
    },
  };

  return (
    <div className="container" style={{ paddingTop: 18 }}>
      <ProductDetail product={product} />
      {similar.length > 0 && <ProductSection title="Similar products" href="/products" products={similar} layout="rail" />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
    </div>
  );
}
