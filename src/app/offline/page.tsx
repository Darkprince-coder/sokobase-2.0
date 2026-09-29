import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default function Offline() {
  return <ComingSoon title="You are offline" text="Check your connection and try again. Pages you have not opened yet cannot load without internet." />;
}
