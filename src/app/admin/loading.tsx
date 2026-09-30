import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Skeleton style={{ height: 30, width: 200, borderRadius: 6 }} />
      <Skeleton style={{ height: 300, borderRadius: 16 }} />
    </div>
  );
}
