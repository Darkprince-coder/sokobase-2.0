import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40, display: "grid", gap: 12 }}>
      {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} style={{ height: 78, borderRadius: 12 }} />)}
    </div>
  );
}
