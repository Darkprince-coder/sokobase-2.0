import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return <ComingSoon title="Products" text="Product browsing, filters and search arrive in Session 6." />;
}
