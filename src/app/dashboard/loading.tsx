import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Skeleton style={{ height: 30, width: 200, borderRadius: 6 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} style={{ height: 84, borderRadius: 12 }} />)}
      </div>
      <Skeleton style={{ height: 220, borderRadius: 16 }} />
    </div>
  );
}
