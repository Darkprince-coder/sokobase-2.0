import { ProductGrid } from "@/components/Skeleton";
import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40, display: "grid", gap: 20 }}>
      <Skeleton style={{ height: 120, borderRadius: 16 }} />
      <ProductGrid count={8} />
    </div>
  );
}
