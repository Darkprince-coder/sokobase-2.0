import type { Metadata } from "next";
import SavedList from "@/components/SavedList";

export const metadata: Metadata = { title: "Saved items", robots: { index: false } };

export default function Saved() {
  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Saved items</h1>
      <SavedList />
    </div>
  );
}
