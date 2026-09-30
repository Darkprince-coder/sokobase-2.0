import { ProductGrid } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <ProductGrid count={8} />
    </div>
  );
}
