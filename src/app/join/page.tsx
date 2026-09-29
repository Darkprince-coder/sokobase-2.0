import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "List your business" };

export default function Page() {
  return <ComingSoon title="List your business" text="Registration by invite code arrives in Session 4. For now, message SokoBase on WhatsApp to get started." />;
}
