import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40, display: "grid", gap: 24 }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
        <Skeleton style={{ aspectRatio: "1/1", borderRadius: 14 }} />
        <div style={{ display: "grid", gap: 10 }}>
          <Skeleton style={{ height: 26, width: "80%", borderRadius: 6 }} />
          <Skeleton style={{ height: 32, width: "40%", borderRadius: 6 }} />
          <Skeleton style={{ height: 44, width: "100%", borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}
